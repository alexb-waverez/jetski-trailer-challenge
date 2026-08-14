import React, { useEffect, useRef } from 'react';
import { Competitor } from '../types';

declare var Chart: any; // Let TypeScript know about the global Chart object from the CDN

interface ResultsChartProps {
  data: Competitor[];
}

const ResultsChart: React.FC<ResultsChartProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any | null>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) {
      return;
    }

    // Destroy previous chart instance if it exists
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
        return;
    }
    
    const labels = data.map(c => c.fullName);
    const runTimes = data.map(c => c.elapsedTime! / 1000); // in seconds
    const penaltyTimes = data.map(c => c.penaltyPoints * 5); // in seconds

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Run Time (s)',
            data: runTimes,
            backgroundColor: 'rgba(34, 211, 238, 0.75)', // cyan-400
            borderColor: 'rgba(34, 211, 238, 1)',
            borderWidth: 1.5,
            borderRadius: 6,
          },
          {
            label: 'Penalty Time (s)',
            data: penaltyTimes,
            backgroundColor: 'rgba(251, 191, 36, 0.75)', // amber-400
            borderColor: 'rgba(251, 191, 36, 1)',
            borderWidth: 1.5,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: 'Competitor Times Breakdown',
                color: '#f3f4f6', // gray-100
                font: {
                    size: 16,
                    weight: 'bold',
                }
            },
            legend: {
                labels: {
                    color: '#e5e7eb', // gray-200
                    font: {
                      weight: 'bold'
                    }
                }
            },
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed.y !== null) {
                    label += context.parsed.y.toFixed(3) + 's';
                  }
                  return label;
                }
              }
            }
        },
        scales: {
          x: {
            stacked: true,
            ticks: {
                color: '#9ca3af', // gray-400
            },
            grid: {
                color: 'rgba(156, 163, 175, 0.2)' // gray-400 with alpha
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: {
              display: true,
              text: 'Time (seconds)',
              color: '#d1d5db', // gray-300
            },
            ticks: {
                color: '#9ca3af', // gray-400
            },
            grid: {
                color: 'rgba(156, 163, 175, 0.2)' // gray-400 with alpha
            }
          },
        },
      },
    });

    // Cleanup function
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data]); // Rerender chart when data changes

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4 md:p-6 mt-8">
       <div style={{ position: 'relative', height: '400px' }}>
         <canvas ref={canvasRef}></canvas>
       </div>
    </div>
  );
};

export default ResultsChart;
