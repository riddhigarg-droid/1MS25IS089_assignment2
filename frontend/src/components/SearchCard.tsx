import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import type { SearchResultItem } from '../types';

interface SearchCardProps {
  source: SearchResultItem;
  index?: number;
}

export const SearchCard: React.FC<SearchCardProps> = ({ source, index }) => {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-purple-500/30 transition-all duration-200 text-left cursor-pointer"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {index !== undefined && (
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold flex items-center justify-center">
                {index + 1}
              </span>
            )}
            <Globe className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="text-xs text-slate-400 font-mono truncate">{source.domain}</span>
          </div>
          <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>
        <h4 className="text-xs font-medium text-slate-200 group-hover:text-white line-clamp-1 leading-snug">
          {source.title}
        </h4>
        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
          {source.snippet}
        </p>
      </div>
    </a>
  );
};
