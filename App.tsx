import React, { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Competitor, CompetitorStatus } from './types';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import CompetitionPage from './pages/CompetitionPage';
import ResultsPage from './pages/ResultsPage';

const App: React.FC = () => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  const addCompetitor = (fullName: string, companyName: string) => {
    const newCompetitor: Competitor = {
      id: new Date().toISOString() + Math.random(),
      fullName,
      companyName,
      startTime: null,
      endTime: null,
      elapsedTime: null,
      status: CompetitorStatus.Pending,
      penaltyPoints: 0,
    };
    setCompetitors(prev => [...prev, newCompetitor]);
  };
  
  const resetCompetition = () => {
    setCompetitors([]);
  };

  const updateCompetitor = (id: string, updates: Partial<Competitor>) => {
    setCompetitors(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
        <Header />
        <main className="container mx-auto p-4 md:p-8">
          <Routes>
            <Route
              path="/"
              element={<HomePage addCompetitor={addCompetitor} competitors={competitors} resetCompetition={resetCompetition} />}
            />
            <Route
              path="/competition"
              element={<CompetitionPage competitors={competitors} updateCompetitor={updateCompetitor} />}
            />
            <Route path="/results" element={<ResultsPage competitors={competitors} />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
