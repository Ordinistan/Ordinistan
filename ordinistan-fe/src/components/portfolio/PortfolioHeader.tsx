import { FiGrid, FiList } from 'react-icons/fi';

interface PortfolioHeaderProps {
  view: 'grid' | 'list';
  setView: (view: 'grid' | 'list') => void;
}

const PortfolioHeader = ({ view, setView }: PortfolioHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
      <div className="mb-6 sm:mb-0">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-core-primary to-core-secondary 
                     bg-clip-text text-transparent mb-2">
          My Portfolio
        </h1>
        <p className="text-core-muted">Manage your Ordinals collection</p>
      </div>
      <div className="flex gap-4">
        <button 
          onClick={() => setView('grid')}
          className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-core-primary text-white' : 'text-core-muted hover:text-core-primary'}`}
        >
          <FiGrid className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView('list')}
          className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-core-primary text-white' : 'text-core-muted hover:text-core-primary'}`}
        >
          <FiList className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default PortfolioHeader; 