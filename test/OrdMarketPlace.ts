import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { OrdMarketPlace, ERC721Collection, ERC1155Collection, ERC721Factory, ERC1155Factory } from "../typechain-types";

describe("OrdMarketPlace", function () {
    let marketplace: OrdMarketPlace;
    let erc721Factory: ERC721Factory;
    let erc1155Factory: ERC1155Factory;
    let erc721Collection: ERC721Collection;
    let erc1155Collection: ERC1155Collection;
    let owner: SignerWithAddress;
    let seller: SignerWithAddress;
    let buyer: SignerWithAddress;
    
    const PLATFORM_FEE = 250; // 2.5%
    
    beforeEach(async function () {
        [owner, seller, buyer] = await ethers.getSigners();
        
        // Deploy factories
        const ERC721FactoryContract = await ethers.getContractFactory("ERC721Factory");
        erc721Factory = await ERC721FactoryContract.deploy() as ERC721Factory;

        const ERC1155FactoryContract = await ethers.getContractFactory("ERC1155Factory");
        erc1155Factory = await ERC1155FactoryContract.deploy() as ERC1155Factory;
        
        // Create collections
        await erc721Factory.connect(seller).createCollection(
            "Test721",
            "TST721",
            100 // 1% royalty
        );
        const erc721Events = await erc721Factory.queryFilter(erc721Factory.filters.CollectionCreated());
        const erc721Address = erc721Events[0].args.collection;
        erc721Collection = await ethers.getContractAt("ERC721Collection", erc721Address) as ERC721Collection;

        await erc1155Factory.connect(seller).createCollection(
            "Test1155",
            "TST1155",
            "https://api.example.com/token/",
            100 // 1% royalty
        );
        const erc1155Events = await erc1155Factory.queryFilter(erc1155Factory.filters.CollectionCreated());
        const erc1155Address = erc1155Events[0].args.collection;
        erc1155Collection = await ethers.getContractAt("ERC1155Collection", erc1155Address) as ERC1155Collection;
        
        // Deploy marketplace
        const MarketPlaceFactory = await ethers.getContractFactory("OrdMarketPlace");
        marketplace = (await upgrades.deployProxy(MarketPlaceFactory, [PLATFORM_FEE])) as OrdMarketPlace;
        
        // Add NFT contract support
        await marketplace.addNftContractSupport(erc721Address);
        await marketplace.addNftContractSupport(erc1155Address);
        
        // Mint NFTs to seller
        await erc721Collection.connect(seller).mint(seller.address, "ipfs://token1");
        await erc1155Collection.connect(seller).mint(seller.address, 1, 10, "0x");
        
        // Approve marketplace
        await erc721Collection.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
        await erc1155Collection.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
    });

    describe("Initialization", function () {
        it("Should set the platform fee correctly", async function () {
            expect(await marketplace.platformFees()).to.equal(PLATFORM_FEE);
        });

        it("Should set the owner correctly", async function () {
            expect(await marketplace.owner()).to.equal(owner.address);
        });
    });

    describe("NFT Listing", function () {
        it("Should list ERC721 NFT correctly", async function () {
            const price = ethers.parseEther("1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;

            await expect(marketplace.connect(seller).placeOrderForSell(
                1,
                await erc721Collection.getAddress(),
                0,
                price,
                ethers.ZeroAddress,
                endTime
            )).to.emit(marketplace, "OrderCreated");

            const order = await marketplace.order(0);
            expect(order.seller).to.equal(seller.address);
            expect(order.pricePerNFT).to.equal(price);
        });

        it("Should list ERC1155 NFT correctly", async function () {
            const price = ethers.parseEther("0.1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            const copies = 5;

            await expect(marketplace.connect(seller).placeOrderForSell(
                1,
                await erc1155Collection.getAddress(),
                copies,
                price,
                ethers.ZeroAddress,
                endTime
            )).to.emit(marketplace, "OrderCreated");

            const order = await marketplace.order(0);
            expect(order.copies).to.equal(copies);
        });
    });

    describe("NFT Purchase", function () {
        it("Should allow buying ERC721 NFT with correct ETH amount", async function () {
            const price = ethers.parseEther("1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;

            // First approve and transfer to marketplace
            await erc721Collection.connect(seller).approve(await marketplace.getAddress(), 1);

            console.log("NFT owner:", await erc721Collection.ownerOf(1));
            
            await marketplace.connect(seller).placeOrderForSell(
                1,
                await erc721Collection.getAddress(),
                0,
                price,
                ethers.ZeroAddress,
                endTime
            );

            // Verify NFT is in marketplace
            expect(await erc721Collection.ownerOf(1)).to.equal(await marketplace.getAddress());

            await expect(marketplace.connect(buyer).buyNow(0, 0, {
                value: price
            })).to.emit(marketplace, "OrderPurchased");

            // Verify buyer now owns the NFT
            expect(await erc721Collection.ownerOf(1)).to.equal(buyer.address);
        });

        it("Should allow buying ERC1155 NFT partially", async function () {
            const price = ethers.parseEther("0.1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            const totalCopies = 5;
            const buyAmount = 2;

            // First approve and transfer to marketplace
            await erc1155Collection.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);

            await marketplace.connect(seller).placeOrderForSell(
                1,
                await erc1155Collection.getAddress(),
                totalCopies,
                price,
                ethers.ZeroAddress,
                endTime
            );

            // Verify NFTs are in marketplace
            expect(await erc1155Collection.balanceOf(await marketplace.getAddress(), 1)).to.equal(totalCopies);

            const totalPrice = price * BigInt(buyAmount);

            await expect(marketplace.connect(buyer).buyNow(0, buyAmount, {
                value: totalPrice
            })).to.emit(marketplace, "OrderPurchased");

            // Verify correct amount transferred
            expect(await erc1155Collection.balanceOf(buyer.address, 1)).to.equal(buyAmount);
        });
    });

    describe("Bidding", function () {
        let orderId: number;
        
        beforeEach(async function () {
            // Mint a new NFT to seller
            await erc721Collection.connect(seller).mint(seller.address, "ipfs://token2");
            
            // Create a new listing
            const price = ethers.parseEther("1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;

            await marketplace.connect(seller).placeOrderForSell(
                2, // Using token ID 2 for bidding tests
                await erc721Collection.getAddress(),
                0,
                price,
                ethers.ZeroAddress,
                endTime
            );
            orderId = 0; // First order will have ID 0
        });

        it("Should allow placing bid", async function () {
            const bidPrice = ethers.parseEther("0.8");
            const endTime = Math.floor(Date.now() / 1000) + 43200;

            await expect(marketplace.connect(buyer).placeOfferForOrder(
                orderId,
                0,
                bidPrice,
                endTime,
                { value: bidPrice }
            )).to.emit(marketplace, "BidPlaced");
        });

        it("Should allow seller to accept bid", async function () {
            const bidPrice = ethers.parseEther("0.8");
            const endTime = Math.floor(Date.now() / 1000) + 43200;

            await marketplace.connect(buyer).placeOfferForOrder(
                orderId,
                0,
                bidPrice,
                endTime,
                { value: bidPrice }
            );

            await expect(marketplace.connect(seller).acceptBid(orderId, 0))
                .to.emit(marketplace, "BidAccepted");

            expect(await erc721Collection.ownerOf(2)).to.equal(buyer.address);
        });

        it("Should allow multiple bids on same order", async function () {
            const bidPrice1 = ethers.parseEther("0.8");
            const bidPrice2 = ethers.parseEther("0.9");
            const endTime = Math.floor(Date.now() / 1000) + 43200;

            // Place first bid
            await marketplace.connect(buyer).placeOfferForOrder(
                orderId,
                0,
                bidPrice1,
                endTime,
                { value: bidPrice1 }
            );

            // Place second bid from different buyer
            const otherBuyer = (await ethers.getSigners())[3];
            await marketplace.connect(otherBuyer).placeOfferForOrder(
                orderId,
                0,
                bidPrice2,
                endTime,
                { value: bidPrice2 }
            );

            // Verify both bids exist
            const bid1 = await marketplace.bids(orderId, 0);
            const bid2 = await marketplace.bids(orderId, 1);

            expect(bid1.bidder).to.equal(buyer.address);
            expect(bid2.bidder).to.equal(otherBuyer.address);
            expect(bid1.pricePerNFT).to.equal(bidPrice1);
            expect(bid2.pricePerNFT).to.equal(bidPrice2);
        });

        it("Should reject expired bids", async function () {
            const bidPrice = ethers.parseEther("0.8");
            const orderEndTime = Math.floor(Date.now() / 1000) + 86400; // Order end time is 24h from now
            const bidEndTime = Math.floor(Date.now() / 1000) + 43200; // Bid end time is 12h from now

            // Mint a new NFT specifically for this test
            await erc721Collection.connect(seller).mint(seller.address, "ipfs://token3");
            await erc721Collection.connect(seller).approve(await marketplace.getAddress(), 3);

            // Create order with the new NFT
            await marketplace.connect(seller).placeOrderForSell(
                3,  // Using token ID 3 instead of 2
                await erc721Collection.getAddress(),
                0,
                ethers.parseEther("1"),
                ethers.ZeroAddress,
                orderEndTime
            );

            // Place bid
            await marketplace.connect(buyer).placeOfferForOrder(
                0, // orderId
                0, // copies (0 for ERC721)
                bidPrice,
                bidEndTime,
                { value: bidPrice }
            );

            // Increase time by 12 hours + 1 second
            await ethers.provider.send("evm_increaseTime", [43201]);
            await ethers.provider.send("evm_mine", []);

            // Try to accept expired bid
            await expect(marketplace.connect(seller).acceptBid(0, 0))
                .to.be.revertedWith("Bid expired");
        });

        it("Should reject bid with expired endTime", async function () {
            const bidPrice = ethers.parseEther("0.8");
            const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

            await expect(marketplace.connect(buyer).placeOfferForOrder(
                orderId,
                0,
                bidPrice,
                pastTime,
                { value: bidPrice }
            )).to.be.revertedWith("endTime should be in future");
        });
    });

    describe("Platform Fee Management", function () {
        it("Should allow owner to update platform fee", async function () {
            const newFee = 300; // 3%
            await marketplace.setPlatformFees(newFee);
            expect(await marketplace.platformFees()).to.equal(newFee);
        });

        it("Should reject platform fee greater than 5%", async function () {
            const invalidFee = 50001; // 5.0001%
            await expect(marketplace.setPlatformFees(invalidFee))
                .to.be.revertedWith("High fee");
        });

        it("Should reject platform fee update from non-owner", async function () {
            await expect(marketplace.connect(buyer).setPlatformFees(300))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("NFT Contract Support", function () {
        it("Should allow owner to add NFT contract support", async function () {
            const MockERC721Factory = await ethers.getContractFactory("MockERC721");
            const newNFT = await MockERC721Factory.deploy();
            
            await marketplace.addNftContractSupport(await newNFT.getAddress());
            expect(await marketplace.nftContracts(await newNFT.getAddress())).to.be.true;
        });

        it("Should reject NFT listing for unsupported contract", async function () {
            const MockERC721Factory = await ethers.getContractFactory("MockERC721");
            const unsupportedNFT = await MockERC721Factory.deploy();
            
            const price = ethers.parseEther("1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;

            await expect(marketplace.connect(seller).placeOrderForSell(
                1,
                await unsupportedNFT.getAddress(),
                0,
                price,
                ethers.ZeroAddress,
                endTime
            )).to.be.revertedWith("Invalid NFT Contract");
        });
    });

    describe("Order Management", function () {
        it("Should allow seller to cancel order", async function () {
            const price = ethers.parseEther("1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;

            await marketplace.connect(seller).placeOrderForSell(
                1,
                await erc721Collection.getAddress(),
                0,
                price,
                ethers.ZeroAddress,
                endTime
            );

            await expect(marketplace.connect(seller).cancelOrder(0))
                .to.emit(marketplace, "OrderCancelled");

            expect(await erc721Collection.ownerOf(1)).to.equal(seller.address);
        });

        it("Should reject order cancellation from non-seller", async function () {
            const price = ethers.parseEther("1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;

            await marketplace.connect(seller).placeOrderForSell(
                1,
                await erc721Collection.getAddress(),
                0,
                price,
                ethers.ZeroAddress,
                endTime
            );

            await expect(marketplace.connect(buyer).cancelOrder(0))
                .to.be.revertedWith("Invalid request");
        });

        it("Should reject order with zero price", async function () {
            const endTime = Math.floor(Date.now() / 1000) + 86400;

            await expect(marketplace.connect(seller).placeOrderForSell(
                1,
                await erc721Collection.getAddress(),
                0,
                0,
                ethers.ZeroAddress,
                endTime
            )).to.be.revertedWith("Invalid price");
        });

        it("Should reject order with past end time", async function () {
            const price = ethers.parseEther("1");
            const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

            await expect(marketplace.connect(seller).placeOrderForSell(
                1,
                await erc721Collection.getAddress(),
                0,
                price,
                ethers.ZeroAddress,
                pastTime
            )).to.be.revertedWith("endTime should be in future");
        });
    });

    describe("Bulk Operations", function () {
        beforeEach(async function () {
            // Mint additional NFTs
            await erc721Collection.connect(seller).mint(seller.address, "ipfs://token2");
            await erc721Collection.connect(seller).mint(seller.address, "ipfs://token3");
            
            // Approve marketplace for all NFTs
            await erc721Collection.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
        });

        it("Should allow bulk buying of NFTs", async function () {
            const price = ethers.parseEther("1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;

            // List multiple NFTs
            for (let i = 1; i <= 3; i++) {
                await marketplace.connect(seller).placeOrderForSell(
                    i,
                    await erc721Collection.getAddress(),
                    0,
                    price,
                    ethers.ZeroAddress,
                    endTime
                );
            }

            const orderIds = [0, 1, 2];
            const amounts = [0, 0, 0]; // 0 for ERC721
            const totalValue = price * BigInt(3);

            await expect(marketplace.connect(buyer).bulkBuy(orderIds, amounts, {
                value: totalValue
            })).to.emit(marketplace, "OrderPurchased");

            // Verify ownership transfer
            for (let i = 1; i <= 3; i++) {
                expect(await erc721Collection.ownerOf(i)).to.equal(buyer.address);
            }
        });

        it("Should reject bulk buy with mismatched arrays", async function () {
            await expect(marketplace.connect(buyer).bulkBuy(
                [0, 1],
                [0],
                { value: ethers.parseEther("2") }
            )).to.be.revertedWith("Not same length input");
        });
    });

    describe("Token Support Management", function () {
        let mockERC20: any; // Using any type to avoid Contract type issues

        beforeEach(async function () {
            const MockERC20Factory = await ethers.getContractFactory("MockERC20");
            mockERC20 = await MockERC20Factory.deploy();
            await marketplace.addTokenSupport(await mockERC20.getAddress());
        });

        it("Should allow ERC20 token payments", async function () {
            const price = ethers.parseEther("100");
            const endTime = Math.floor(Date.now() / 1000) + 86400;

            // Calculate all fees
            const platformFee = (price * BigInt(PLATFORM_FEE)) / 10000n;
            const royaltyFee = (price * BigInt(100)) / 10000n; // 1% royalty
            const totalAmount = price; // Just the price for now

            // Mint tokens to buyer and approve marketplace
            await mockERC20.mint(buyer.address, totalAmount);
            await mockERC20.connect(buyer).approve(await marketplace.getAddress(), totalAmount);

            // Mint additional tokens for fees and royalties
            await mockERC20.mint(buyer.address, platformFee + royaltyFee);
            await mockERC20.connect(buyer).approve(await marketplace.getAddress(), platformFee + royaltyFee);

            // List NFT
            await erc721Collection.connect(seller).approve(await marketplace.getAddress(), 1);
            await marketplace.connect(seller).placeOrderForSell(
                1,
                await erc721Collection.getAddress(),
                0,
                price,
                await mockERC20.getAddress(),
                endTime
            );

            // Record initial balances
            const initialSellerBalance = await mockERC20.balanceOf(seller.address);
            const initialBuyerBalance = await mockERC20.balanceOf(buyer.address);

            await mockERC20.connect(buyer).approve(await marketplace.getAddress(), totalAmount);
            // Execute purchase
            await expect(marketplace.connect(buyer).buyNow(0, 0))
                .to.emit(marketplace, "OrderPurchased");
            // Verify token transfers
            const finalBuyerBalance = await mockERC20.balanceOf(buyer.address);
            const finalSellerBalance = await mockERC20.balanceOf(seller.address);
            
            // Verify balances
            expect(finalBuyerBalance).to.be.lt(initialBuyerBalance); // Buyer spent tokens
            expect(finalSellerBalance).to.be.gt(initialSellerBalance); // Seller received tokens
            
            // Verify NFT ownership
            expect(await erc721Collection.ownerOf(1)).to.equal(buyer.address);
        });

        it("Should handle ERC20 royalties correctly", async function () {
            const price = ethers.parseEther("100");
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            
            // Get a different signer for royalty receiver
            const royaltyReceiver = (await ethers.getSigners())[4];
            
            // Set royalty receiver to a different address
            await erc721Collection.connect(seller).setTokenRoyalty(
                1,  // tokenId
                royaltyReceiver.address,  // new royalty receiver
                100  // 1% royalty
            );
            
            // Calculate fees in same order as contract
            const totalAmount = price;
            const platformFee = (totalAmount * BigInt(PLATFORM_FEE)) / 10000n; // 2.5% of 100 = 2.5 ETH
            const priceAfterPlatformFee = totalAmount - platformFee; // 97.5 ETH
            const royaltyFee = (priceAfterPlatformFee * 100n) / 10000n; // 1% of 97.5 = 0.975 ETH
            const expectedSellerAmount = priceAfterPlatformFee - royaltyFee; // 97.5 - 0.975 = 96.525 ETH

            // Deploy and setup ERC20 token
            const MockERC20Factory = await ethers.getContractFactory("MockERC20");
            const mockERC20 = await MockERC20Factory.deploy();
            await marketplace.addTokenSupport(await mockERC20.getAddress());

            // Mint tokens to buyer and approve marketplace
            await mockERC20.mint(buyer.address, totalAmount);
            await mockERC20.connect(buyer).approve(await marketplace.getAddress(), totalAmount);

            // List NFT
            await erc721Collection.connect(seller).approve(await marketplace.getAddress(), 1);
            await marketplace.connect(seller).placeOrderForSell(
                1,
                await erc721Collection.getAddress(),
                0,
                price,
                await mockERC20.getAddress(),
                endTime
            );

            // Record initial balances
            const initialSellerBalance = await mockERC20.balanceOf(seller.address);
            const initialRoyaltyReceiverBalance = await mockERC20.balanceOf(royaltyReceiver.address);

            // Execute purchase
            await marketplace.connect(buyer).buyNow(0, 0);

            // Verify balances
            const finalSellerBalance = await mockERC20.balanceOf(seller.address);
            const finalRoyaltyReceiverBalance = await mockERC20.balanceOf(royaltyReceiver.address);
            
            // Seller should receive: priceAfterPlatformFee - royaltyFee = 96.525 ETH
            expect(finalSellerBalance - initialSellerBalance).to.equal(expectedSellerAmount);
            
            // Royalty receiver should get 0.975 ETH (1% of 97.5)
            expect(finalRoyaltyReceiverBalance - initialRoyaltyReceiverBalance).to.equal(royaltyFee);
        });
    });

    describe("Fee Collection", function () {
        it("Should collect platform fees correctly for ETH sales", async function () {
            const price = ethers.parseEther("1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            
            await marketplace.connect(seller).placeOrderForSell(
                1,
                await erc721Collection.getAddress(),
                0,
                price,
                ethers.ZeroAddress,
                endTime
            );

            await marketplace.connect(buyer).buyNow(0, 0, { value: price });

            const expectedFee = (price * BigInt(PLATFORM_FEE)) / 10000n;
            const feeInfo = await marketplace.feeCollected(ethers.ZeroAddress);
            expect(feeInfo.feeGenerated).to.equal(expectedFee);
        });

        it("Should allow owner to collect accumulated fees", async function () {
            const price = ethers.parseEther("1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            
            await marketplace.connect(seller).placeOrderForSell(
                1,
                await erc721Collection.getAddress(),
                0,
                price,
                ethers.ZeroAddress,
                endTime
            );

            await marketplace.connect(buyer).buyNow(0, 0, { value: price });

            const expectedFee = (price * BigInt(PLATFORM_FEE)) / 10000n;
            const initialBalance = await ethers.provider.getBalance(owner.address);
            
            await marketplace.collectAdminFees(ethers.ZeroAddress, owner.address);
            
            const finalBalance = await ethers.provider.getBalance(owner.address);
            expect(finalBalance - initialBalance).to.be.closeTo(expectedFee, ethers.parseEther("0.01"));
        });
    });

    describe("Edge Cases", function () {
        it("Should handle zero address checks", async function () {
            const price = ethers.parseEther("1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;

            await expect(marketplace.connect(seller).placeOrderForSell(
                1,
                ethers.ZeroAddress,
                0,
                price,
                ethers.ZeroAddress,
                endTime
            )).to.be.revertedWith("Invalid NFT Contract");
        });

        it("Should prevent self-bidding", async function () {
            const price = ethers.parseEther("1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;

            await marketplace.connect(seller).placeOrderForSell(
                1,
                await erc721Collection.getAddress(),
                0,
                price,
                ethers.ZeroAddress,
                endTime
            );

            await expect(marketplace.connect(seller).placeOfferForOrder(
                0,
                0,
                price,
                endTime,
                { value: price }
            )).to.be.revertedWith("Invalid request");
        });

        it("Should handle partial ERC1155 purchases correctly", async function () {
            const price = ethers.parseEther("0.1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            const totalCopies = 5;
            
            await marketplace.connect(seller).placeOrderForSell(
                1,
                await erc1155Collection.getAddress(),
                totalCopies,
                price,
                ethers.ZeroAddress,
                endTime
            );

            // First purchase
            await marketplace.connect(buyer).buyNow(0, 2, { value: price * BigInt(2) });
            expect(await erc1155Collection.balanceOf(buyer.address, 1)).to.equal(2);

            // Second purchase
            const otherBuyer = (await ethers.getSigners())[3];
            await marketplace.connect(otherBuyer).buyNow(0, 3, { value: price * BigInt(3) });
            expect(await erc1155Collection.balanceOf(otherBuyer.address, 1)).to.equal(3);

            // Verify order is completed
            const order = await marketplace.order(0);
            expect(order.copies).to.equal(0);
        });
    });

    describe("Royalties", function () {
        it("Should handle ETH royalties correctly for ERC721", async function () {
            const price = ethers.parseEther("1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            const royaltyAmount = (price * 100n) / 10000n; // 1% royalty
            const platformFee = (price * BigInt(PLATFORM_FEE)) / 10000n;
            
            // Record initial balances
            const initialSellerBalance = await ethers.provider.getBalance(seller.address);
            const initialBuyerBalance = await ethers.provider.getBalance(buyer.address);
            
            // List NFT
            await marketplace.connect(seller).placeOrderForSell(
                1,
                await erc721Collection.getAddress(),
                0,
                price,
                ethers.ZeroAddress,
                endTime
            );

            // Buy NFT
            await marketplace.connect(buyer).buyNow(0, 0, { value: price });

            // Check final balances
            const finalSellerBalance = await ethers.provider.getBalance(seller.address);
            
            // Seller should receive price minus royalty
            expect(finalSellerBalance - initialSellerBalance).to.be.closeTo(
                price - royaltyAmount - platformFee,
                ethers.parseEther("0.01") // Allow for gas costs
            );
        });

        it("Should handle ERC20 royalties correctly", async function () {
            const price = ethers.parseEther("100");
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            
            // Get a different signer for royalty receiver
            const royaltyReceiver = (await ethers.getSigners())[4];
            
            // Set royalty receiver to a different address
            await erc721Collection.connect(seller).setTokenRoyalty(
                1,  // tokenId
                royaltyReceiver.address,  // new royalty receiver
                100  // 1% royalty
            );
            
            // Calculate fees in same order as contract
            const totalAmount = price;
            const platformFee = (totalAmount * BigInt(PLATFORM_FEE)) / 10000n; // 2.5% of 100 = 2.5 ETH
            const priceAfterPlatformFee = totalAmount - platformFee; // 97.5 ETH
            const royaltyFee = (priceAfterPlatformFee * 100n) / 10000n; // 1% of 97.5 = 0.975 ETH
            const expectedSellerAmount = priceAfterPlatformFee - royaltyFee; // 97.5 - 0.975 = 96.525 ETH

            // Deploy and setup ERC20 token
            const MockERC20Factory = await ethers.getContractFactory("MockERC20");
            const mockERC20 = await MockERC20Factory.deploy();
            await marketplace.addTokenSupport(await mockERC20.getAddress());

            // Mint tokens to buyer and approve marketplace
            await mockERC20.mint(buyer.address, totalAmount);
            await mockERC20.connect(buyer).approve(await marketplace.getAddress(), totalAmount);

            // List NFT
            await erc721Collection.connect(seller).approve(await marketplace.getAddress(), 1);
            await marketplace.connect(seller).placeOrderForSell(
                1,
                await erc721Collection.getAddress(),
                0,
                price,
                await mockERC20.getAddress(),
                endTime
            );

            // Record initial balances
            const initialSellerBalance = await mockERC20.balanceOf(seller.address);
            const initialRoyaltyReceiverBalance = await mockERC20.balanceOf(royaltyReceiver.address);

            // Execute purchase
            await marketplace.connect(buyer).buyNow(0, 0);

            // Verify balances
            const finalSellerBalance = await mockERC20.balanceOf(seller.address);
            const finalRoyaltyReceiverBalance = await mockERC20.balanceOf(royaltyReceiver.address);
            
            // Seller should receive: priceAfterPlatformFee - royaltyFee = 96.525 ETH
            expect(finalSellerBalance - initialSellerBalance).to.equal(expectedSellerAmount);
            
            // Royalty receiver should get 0.975 ETH (1% of 97.5)
            expect(finalRoyaltyReceiverBalance - initialRoyaltyReceiverBalance).to.equal(royaltyFee);
        });

        it("Should handle ERC1155 royalties correctly", async function () {
            const pricePerNFT = ethers.parseEther("0.1");
            const copies = 5;
            const totalPrice = pricePerNFT * BigInt(copies);
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            const royaltyAmount = (totalPrice * 100n) / 10000n; // 1% royalty
            const platformFee = (totalPrice * BigInt(PLATFORM_FEE)) / 10000n;

            // Record initial balance
            const initialSellerBalance = await ethers.provider.getBalance(seller.address);

            // List NFTs
            await marketplace.connect(seller).placeOrderForSell(
                1,
                await erc1155Collection.getAddress(),
                copies,
                pricePerNFT,
                ethers.ZeroAddress,
                endTime
            );

            // Buy all copies
            await marketplace.connect(buyer).buyNow(0, copies, { value: totalPrice });

            // Check final balance
            const finalSellerBalance = await ethers.provider.getBalance(seller.address);

            // Seller should receive total price minus royalty and platform fee
            expect(finalSellerBalance - initialSellerBalance).to.be.closeTo(
                totalPrice - royaltyAmount - platformFee,
                ethers.parseEther("0.01") // Allow for gas costs
            );
        });

        it("Should handle custom token royalties", async function () {
            const tokenId = 2;
            const price = ethers.parseEther("1");
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            
            // Get a different signer for royalty receiver
            const royaltyReceiver = (await ethers.getSigners())[4];
            
            // Mint new NFT
            await erc721Collection.connect(seller).mint(seller.address, "ipfs://token2");
            
            // Set custom royalty for this token (2%) with different receiver
            await erc721Collection.connect(seller).setTokenRoyalty(
                tokenId,
                royaltyReceiver.address, // Use different royalty receiver
                200 // 2%
            );

            // Calculate fees in same order as contract
            const totalAmount = price;
            const platformFee = (totalAmount * BigInt(PLATFORM_FEE)) / 10000n; // 2.5% of 1 ETH
            const priceAfterPlatformFee = totalAmount - platformFee; // 0.975 ETH
            const royaltyFee = (priceAfterPlatformFee * 200n) / 10000n; // 2% of 0.975 ETH
            const expectedSellerAmount = priceAfterPlatformFee - royaltyFee;

            // Record initial balances
            const initialSellerBalance = await ethers.provider.getBalance(seller.address);
            const initialRoyaltyReceiverBalance = await ethers.provider.getBalance(royaltyReceiver.address);

            // List NFT
            await marketplace.connect(seller).placeOrderForSell(
                tokenId,
                await erc721Collection.getAddress(),
                0,
                price,
                ethers.ZeroAddress,
                endTime
            );

            // Buy NFT
            await marketplace.connect(buyer).buyNow(0, 0, { value: price });

            // Check final balances
            const finalSellerBalance = await ethers.provider.getBalance(seller.address);
            const finalRoyaltyReceiverBalance = await ethers.provider.getBalance(royaltyReceiver.address);

            // Seller should receive: priceAfterPlatformFee - royaltyFee
            expect(finalSellerBalance - initialSellerBalance).to.be.closeTo(
                expectedSellerAmount,
                ethers.parseEther("0.01") // Allow for gas costs
            );

            // Verify royalty receiver got their share
            expect(finalRoyaltyReceiverBalance - initialRoyaltyReceiverBalance).to.equal(royaltyFee);
        });
    });
});