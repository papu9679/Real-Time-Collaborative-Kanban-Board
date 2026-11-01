import React from 'react';

export const Avatar = ({ name = 'User', avatar = '', size = 'md', className = '' }) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg'
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Consistent color generation based on name
  const colors = [
    'bg-indigo-600',
    'bg-violet-600',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-rose-600',
    'bg-amber-600',
    'bg-teal-600'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorClass = colors[Math.abs(hash) % colors.length];

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        title={name}
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full object-cover ring-2 ring-white dark:ring-slate-900 ${className}`}
        onError={(e) => {
          // Fallback to initials if image fails to load
          e.target.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      title={name}
      className={`${sizeClasses[size] || sizeClasses.md} ${colorClass} rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-white dark:ring-slate-900 shadow-sm ${className}`}
    >
      {initials}
    </div>
  );
};
