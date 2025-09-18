import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange }) => {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        className="sr-only peer" 
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="group peer ring-0 bg-rose-400 rounded-full outline-none duration-300 after:duration-300 w-14 h-7 shadow-md peer-checked:bg-emerald-500 peer-focus:outline-none after:content-[''] after:rounded-full after:absolute after:bg-gray-50 after:outline-none after:h-6 after:w-6 after:top-0.5 after:left-0.5 after:flex after:justify-center after:items-center peer-checked:after:translate-x-7 peer-hover:after:scale-95">
        <svg
          className="absolute top-0.5 left-7 stroke-gray-900 w-6 h-6"
          viewBox="0 0 100 100"
        >
          <path d="M50,18A19.9,19.9,0,0,0,30,38v8a8,8,0,0,0-8,8V74a8,8,0,0,0,8,8H70a8,8,0,0,0,8-8V54a8,8,0,0,0-8-8H38V38a12,12,0,0,1,23.6-3,4,4,0,1,0,7.8-2A20.1,20.1,0,0,0,50,18Z" />
        </svg>
        <svg
          className="absolute top-0.5 left-0.5 stroke-gray-900 w-6 h-6"
          viewBox="0 0 100 100"
        >
          <path d="M30,46V38a20,20,0,0,1,40,0v8a8,8,0,0,1,8,8V74a8,8,0,0,1-8,8H30a8,8,0,0,1-8-8V54A8,8,0,0,1,30,46Zm32-8v8H38V38a12,12,0,0,1,24,0Z" fillRule="evenodd" />
        </svg>
      </div>
    </label>
  );
};

export default Switch;
