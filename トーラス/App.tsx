
import React from 'react';
import ThreeScene from './components/ThreeScene';

const App: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-gray-900 text-white">
      <header className="absolute top-0 left-0 right-0 p-6 text-center z-10">
        <h1 className="text-3xl font-bold tracking-tight text-sky-400"></h1>
        <p className="text-sm text-gray-400"></p>
      </header>
      <div className="w-full h-full">
        <ThreeScene />
      </div>
      <footer className="absolute bottom-0 left-0 right-0 p-4 text-center text-xs text-gray-500 z-10">
        <p>
          <strong className="text-sky-400">Click scene</strong> to lock mouse for camera control, <strong className="text-sky-400">Esc</strong> to unlock.
          Use <strong className="text-sky-400">W/A/S/D</strong> keys to move.
        </p>
        <p><strong className="text-sky-400">A/D:</strong> Move along the main ring. <strong className="text-sky-400">W/S:</strong> Move around the tube.</p>
      </footer>
    </div>
  );
};

export default App;
