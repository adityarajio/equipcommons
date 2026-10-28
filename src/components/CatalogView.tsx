/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ResourceListing, ResourceCategory } from '../types';
import { ResourceCard } from './ResourceCard';
import { Search, Filter, ShieldCheck, Building2, Layers, Check } from 'lucide-react';

interface CatalogViewProps {
  onSelectResource: (resource: ResourceListing) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ onSelectResource }) => {
  const { resources, currentUser } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('all');
  const [onlyEligible, setOnlyEligible] = useState<boolean>(false);

  // Institutions list
  const institutions = Array.from(new Set(resources.map(r => r.institution)));

  const filteredResources = resources.filter(res => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = `${res.name} ${res.modelCode} ${res.facilityName} ${res.institution} ${res.description}`.toLowerCase();
      if (!match.includes(q)) return false;
    }

    // Category
    if (selectedCategory !== 'all' && res.category !== selectedCategory) {
      return false;
    }

    // Institution
    if (selectedInstitution !== 'all' && res.institution !== selectedInstitution) {
      return false;
    }

    // Only certified/eligible
    if (onlyEligible) {
      const userHasQual = currentUser.qualifications.some(
        q => q.id === res.requirements.qualificationId && q.verified
      );
      if (!userHasQual) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Search & Dynamic Filter Strip */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        
        {/* Top Search & Institution row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* Keyword Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search equipment name, model (e.g. FE-SEM, Haas UMC-500), technique..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Institution Selector */}
          <div className="w-full sm:w-64">
            <select
              value={selectedInstitution}
              onChange={e => setSelectedInstitution(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Consortium Facilities</option>
              {institutions.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>

          {/* Eligibility Toggle */}
          <button
            onClick={() => setOnlyEligible(!onlyEligible)}
            className={`w-full sm:w-auto px-3.5 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
              onlyEligible 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold' 
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${onlyEligible ? 'text-emerald-700' : 'text-slate-400'}`} />
            <span className="whitespace-nowrap">My Verified Qualifications Only</span>
          </button>

        </div>

        {/* Category Segmented Filter Buttons */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'All Resources' },
              { id: 'equipment', label: 'Scientific Equipment' },
              { id: 'space', label: 'Controlled Cleanrooms & Spaces' },
              { id: 'fabrication_tool', label: 'Prototyping & CNC Tools' },
              { id: 'testing_facility', label: 'Testing & Characterization' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="text-slate-500 text-xs">
            Showing <strong className="font-mono text-slate-900 tabular-nums">{filteredResources.length}</strong> available assets
          </div>
        </div>

      </div>

      {/* Resource Cards Grid */}
      {filteredResources.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <p className="text-slate-600 text-sm">No resources match the selected criteria or credentials.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedInstitution('all');
              setOnlyEligible(false);
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => (
            <ResourceCard
              key={res.id}
              resource={res}
              onSelect={onSelectResource}
            />
          ))}
        </div>
      )}

    </div>
  );
};
