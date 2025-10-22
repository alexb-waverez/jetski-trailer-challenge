
import React, { useRef, useState } from 'react';
import { Competitor, CompetitorStatus } from '../types';
import ResultsChart from '../components/ResultsChart';

declare var html2canvas: any;
declare var jspdf: any;

interface ResultsPageProps {
  competitors: Competitor[];
}

const PENALTY_MS = 5000;

const formatTime = (ms: number | null): string => {
    if (ms === null) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
  
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(
      milliseconds
    ).padStart(3, '0')}`;
  };

const ResultsPage: React.FC<ResultsPageProps> = ({ competitors }) => {
    const [isSavingPdf, setIsSavingPdf] = useState(false);
    const resultsRef = useRef<HTMLDivElement>(null);
    const generatedAt = new Date().toLocaleString();

    const finishedCompetitors = competitors
        .filter(c => c.status === CompetitorStatus.Finished && c.elapsedTime !== null)
        .sort((a, b) => 
            (a.elapsedTime! + a.penaltyPoints * PENALTY_MS) - 
            (b.elapsedTime! + b.penaltyPoints * PENALTY_MS)
        );
        
    const disqualifiedCompetitors = competitors.filter(
        c => c.status === CompetitorStatus.Disqualified
    );

    const handleSavePdf = async () => {
        if (!resultsRef.current || isSavingPdf || finishedCompetitors.length === 0) return;
    
        setIsSavingPdf(true);
    
        try {
            const canvas = await html2canvas(resultsRef.current, {
                backgroundColor: '#111827', // bg-gray-900, to match body
                scale: 2 
            });
    
            const imgData = canvas.toDataURL('image/png');
            // Use window.jspdf as it's loaded from CDN
            const pdf = new jspdf.jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4'
            });
    
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            let heightLeft = imgHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            pdf.save('jetski-competition-results.pdf');

        } catch (error) {
            console.error("Failed to generate PDF", error);
        } finally {
            setIsSavingPdf(false);
        }
    };

    const getRankColor = (rank: number) => {
        if (rank === 0) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'; // Gold
        if (rank === 1) return 'bg-gray-400/20 text-gray-200 border-gray-400/30'; // Silver
        if (rank === 2) return 'bg-orange-600/20 text-orange-400 border-orange-600/30'; // Bronze
        return 'bg-gray-800 border-gray-700';
    }

    const hasFinished = finishedCompetitors.length > 0;
    const hasDisqualified = disqualifiedCompetitors.length > 0;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-sky-400 mb-2">Final Results</h1>
        <p className="text-lg text-gray-400">Leaderboard of the fastest competitors.</p>
      </div>

      {!hasFinished && !hasDisqualified && (
         <p className="text-center text-gray-400 text-xl mt-10">No competitors have finished or been disqualified yet.</p>
      )}

      {hasFinished ? (
      <>
        <div className="flex justify-center mb-6">
            <button
                onClick={handleSavePdf}
                disabled={isSavingPdf}
                className="py-2 px-6 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-md transition duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100"
            >
                {isSavingPdf ? 'Saving PDF...' : 'Save as PDF'}
            </button>
        </div>
        <div ref={resultsRef} className="p-4">
            <div className="text-right text-sm text-gray-400 mb-2">
                Generated: {generatedAt}
            </div>
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                {/*-- Desktop Header --*/}
                <div className="hidden md:grid md:grid-cols-[80px_1fr_1fr_120px_150px] bg-gray-700 text-left">
                    <div className="p-4 text-sm font-semibold uppercase tracking-wider text-center">Rank</div>
                    <div className="p-4 text-sm font-semibold uppercase tracking-wider">Name</div>
                    <div className="p-4 text-sm font-semibold uppercase tracking-wider">Company</div>
                    <div className="p-4 text-sm font-semibold uppercase tracking-wider text-center">Penalties</div>
                    <div className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Final Time</div>
                </div>
                {/*-- Results List --*/}
                <div className="md:border-t border-gray-700">
                    {finishedCompetitors.map((c, index) => (
                        <div key={c.id} className={`md:grid md:grid-cols-[80px_1fr_1fr_120px_150px] md:items-center border-b ${getRankColor(index)}`}>
                            {/*-- Mobile Card View --*/}
                            <div className="p-4 md:hidden">
                                <div className="flex justify-between items-baseline mb-2">
                                    <div className="flex items-baseline text-white">
                                        <span className={`text-xl font-bold mr-3`}>{index + 1}</span>
                                        <span className="font-medium text-lg">{c.fullName}</span>
                                    </div>
                                    <span className="font-mono text-lg">{formatTime(c.elapsedTime! + c.penaltyPoints * PENALTY_MS)}</span>
                                </div>
                                <div className="text-sm text-gray-400">{c.companyName}</div>
                                <div className="text-sm text-orange-400 mt-1">Penalties: {c.penaltyPoints}</div>
                            </div>

                            {/*-- Desktop Row View --*/}
                            <div className="hidden md:flex p-4 font-bold text-lg justify-center items-center">{index + 1}</div>
                            <div className="hidden md:block p-4 font-medium">{c.fullName}</div>
                            <div className="hidden md:block p-4 text-gray-400">{c.companyName}</div>
                            <div className="hidden md:block p-4 font-mono text-center text-orange-400">{c.penaltyPoints}</div>
                            <div className="hidden md:block p-4 font-mono text-right">{formatTime(c.elapsedTime! + c.penaltyPoints * PENALTY_MS)}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="max-w-4xl mx-auto">
                <ResultsChart data={finishedCompetitors} />
            </div>
        </div>
      </>
      ) : (
        hasDisqualified && <p className="text-center text-gray-400 text-xl mt-10">No competitors have finished their runs yet.</p>
      )}
      
      {hasDisqualified && (
        <div className="max-w-4xl mx-auto mt-12">
            <h2 className="text-2xl font-bold text-red-500 mb-4 text-center">Disqualified Competitors</h2>
            <div className="bg-gray-800 rounded-lg shadow-xl p-4 md:p-6">
              <ul className="space-y-3">
                {disqualifiedCompetitors.map(c => (
                  <li key={c.id} className="bg-gray-700 p-4 rounded-md flex justify-between items-center">
                    <span className="font-medium">{c.fullName}</span>
                    <span className="text-gray-400">{c.companyName}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
      )}
    </div>
  );
};

export default ResultsPage;
