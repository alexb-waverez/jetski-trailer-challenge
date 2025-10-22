
import React, { useState } from 'react';
import { Competitor } from '../types';

interface HomePageProps {
  addCompetitor: (fullName: string, companyName: string) => void;
  competitors: Competitor[];
  resetCompetition: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ addCompetitor, competitors, resetCompetition }) => {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim() && companyName.trim()) {
      addCompetitor(fullName, companyName);
      setFullName('');
      setCompanyName('');
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-sky-400 mb-2">Register Competitors</h1>
        <p className="text-lg text-gray-400">Add participants to the Jet Ski Trailer Skills Challenge.</p>
      </div>

      <div className="max-w-lg mx-auto bg-gray-800 rounded-lg shadow-xl p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., John Doe"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-sky-500 focus:border-sky-500 transition"
              required
            />
          </div>
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Acme Inc."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-sky-500 focus:border-sky-500 transition"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            Add Competitor
          </button>
        </form>
      </div>

      {competitors.length > 0 && (
        <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-xl p-6 md:p-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Registered Competitors ({competitors.length})</h2>
                 <button 
                    onClick={resetCompetition}
                    className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition duration-300"
                 >
                    Reset All
                 </button>
            </div>
            <ul className="space-y-3">
            {competitors.map((c) => (
              <li key={c.id} className="bg-gray-700 p-4 rounded-md flex justify-between items-center flex-wrap">
                <span className="font-medium mr-4">{c.fullName}</span>
                <span className="text-gray-400">{c.companyName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HomePage;
