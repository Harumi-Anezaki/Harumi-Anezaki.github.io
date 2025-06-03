
import React from 'react';
import ThreeScene from './components/ThreeScene';

const App: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black relative">
      {/* This div will be controlled by ThreeScene for pointer lock instructions */}
      <div id="blocker" className="absolute w-full h-full bg-black bg-opacity-75 flex items-center justify-center z-50 cursor-pointer">
        <div id="instructions" className="text-center">
          <p className="text-3xl text-white font-bold">Click to Explore</p>
          <p className="text-lg text-gray-300 mt-2">(W, A, S, D = Move, MOUSE = Look)</p>
          <p className="text-sm text-gray-400 mt-1">(Press ESC to release cursor)</p>
        </div>
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 p-2 bg-black bg-opacity-50 rounded-md">
        <h1 className="text-xl sm:text-2xl font-bold text-white text-center">
          Explore the Earth: First-Person
        </h1>
        <p className="text-xs sm:text-sm text-gray-300 text-center mt-1">Mouse to look, WASD to move</p>
      </div>
      <ThreeScene />
    </div>
  );
};

export default App;
