import * as fs from "fs";
import * as path from "path";

export function loadJsonFile(filename: string): any {
    const filePath = path.join(__dirname, "..", filename);
    const fileContent = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContent);
} 