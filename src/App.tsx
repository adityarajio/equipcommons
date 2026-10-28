/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { GuidedTourBanner } from './components/GuidedTourBanner';
import { CatalogView } from './components/CatalogView';
import { MyBookingsView } from './components/MyBookingsView';
import { OwnerManagementView } from './components/OwnerManagementView';
import { AuditLogView } from './components/AuditLogView';
import { FairUsagePolicyView } from './components/FairUsagePolicyView';
import { AdminVerificationView } from './components/AdminVerificationView';
import { ResourceDetailModal } from './components/ResourceDetailModal';
import { CreateListingModal } from './components/CreateListingModal';
import { Shield, Building2, Sparkles, Scale, Lock } from 'lucide-react';

const MainApp: React.FC = () => {
  const { 
    activeTab, 
    resources, 
    selectedResourceIdForModal, 
    setSelectedResourceIdForModal 
  } = useApp();

  const selectedResource = resources.find(r => r.id === selectedResourceIdForModal) || null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      
      {/* Top Navigation Bar */}
      <Header />

      {/* Guided Hackathon Evaluation Bar */}
      <GuidedTourBanner />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'catalog' && (
          <CatalogView onSelectResource={(res) => setSelectedResourceIdForModal(res.id)} />
        )}

        {activeTab === 'my_bookings' && (
          <MyBookingsView />
        )}

        {activeTab === 'owner_portal' && (
          <OwnerManagementView />
        )}

        {activeTab === 'admin_verification' && (
          <AdminVerificationView />
        )}

        {activeTab === 'audit_ledger' && (
          <AuditLogView />
        )}

        {activeTab === 'fair_usage_rules' && (
          <FairUsagePolicyView />
        )}
      </main>

      {/* Resource Detail & Booking Modal */}
      {selectedResource && (
        <ResourceDetailModal
          resource={selectedResource}
          onClose={() => setSelectedResourceIdForModal(null)}
        />
      )}

      {/* Owner Create Listing Modal */}
      <CreateListingModal />

      {/* Clean Institutional Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">EquipCommons</span>
            <span aria-hidden="true">·</span>
            <span>Inter-Institutional Resource Sharing & Equipment Trust Commons</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <span>Asset Governance Framework</span>
            <span aria-hidden="true">·</span>
            <span>Digest-Stamped Audit Trail</span>
            <span aria-hidden="true">·</span>
            <span>Explainable Fair-Allocation Engine</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
