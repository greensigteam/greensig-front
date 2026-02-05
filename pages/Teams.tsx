import React from 'react';
import {
  Plus, Users, UserCheck, Calendar, Award, RefreshCw,
  Edit3, LayoutGrid, Table, Filter, X, Eye,
  Clock, Ban, Star, TrendingUp, CheckCircle, FolderOpen, ChevronDown,
  Umbrella, HeartPulse, GraduationCap, MoreHorizontal,
  CheckCircle2, XCircle, CalendarCheck, CalendarClock
} from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';

import { useTeamsData, TabType } from '../hooks/useTeamsData';
import { EquipesTab, OperateursTab, AbsencesTab } from '../components/teams';
import CompetenceMatrix from '../components/CompetenceMatrix';
import LoadingScreen from '../components/LoadingScreen';

// Modals
import EditEquipeModal from './EditEquipeModal';
import CreateAbsenceModal from './CreateAbsenceModal';
import AbsenceDetailModal from './AbsenceDetailModal';
import EditAbsenceModal from './EditAbsenceModal';
import CreateTeamModal from '../components/modals/CreateTeamModal';
import CreateOperateurModal from '../components/modals/CreateOperateurModal';
import EditOperateurModal from '../components/modals/EditOperateurModal';
import EquipeDetailModal from '../components/modals/EquipeDetailModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import { OperateurDetailModal } from './OperateurDetailPage';
import EditUserModal from '../components/EditUserModal';

import { NiveauCompetence } from '../types/users';

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardCompactProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}

const StatCardCompact: React.FC<StatCardCompactProps> = ({ icon, label, value }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
    <div className="text-sm font-medium text-slate-500 mb-1">{label}</div>
    <div className="flex items-end justify-between relative z-10">
      <div className="text-3xl font-bold text-slate-800">{value}</div>
    </div>
    <div className="absolute top-4 right-4 p-2 bg-slate-50 rounded-lg">
      {icon}
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Teams: React.FC = () => {
  const data = useTeamsData();

  if (data.loading) {
    return (
      <div className="fixed inset-0 z-50">
        <LoadingScreen isLoading={true} loop={true} minDuration={0} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 md:gap-6">
      {/* Stats Bar */}
      {data.stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
          <StatCardCompact icon={<Users className="w-5 h-5 text-blue-500" />} label="Total Opérateurs" value={data.stats.totalOperateurs} />
          <StatCardCompact icon={<UserCheck className="w-5 h-5 text-emerald-500" />} label="Disponibles" value={data.stats.disponibles} />
          <StatCardCompact icon={<Users className="w-5 h-5 text-purple-500" />} label="Équipes" value={data.stats.totalEquipes} />
          <StatCardCompact icon={<Clock className="w-5 h-5 text-orange-500" />} label="Absences en attente" value={data.stats.absencesEnAttente} />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-shrink-0">
        {/* Tabs */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
          {(['equipes', 'operateurs', 'absences', 'competences'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => data.setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                data.activeTab === tab
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'equipes' && <Users className="w-4 h-4" />}
              {tab === 'operateurs' && <UserCheck className="w-4 h-4" />}
              {tab === 'absences' && <Calendar className="w-4 h-4" />}
              {tab === 'competences' && <Award className="w-4 h-4" />}
              <span className="capitalize">
                {tab === 'equipes' ? 'Équipes' : tab === 'operateurs' ? 'Opérateurs' : tab === 'competences' ? 'Compétences' : 'Absences'}
              </span>
              {tab === 'absences' && data.stats && data.stats.absencesEnAttente > 0 && (
                <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
                  {data.stats.absencesEnAttente}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Competences Tab Controls */}
          {data.activeTab === 'competences' && (
            <>
              {data.permissions.isAdmin && (
                <button
                  onClick={() => data.setMatrixEditMode(!data.matrixEditMode)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                    data.matrixEditMode
                      ? 'bg-orange-500 text-white shadow-md hover:bg-orange-600'
                      : 'bg-emerald-600 text-white shadow-md hover:bg-emerald-700'
                  }`}
                >
                  {data.matrixEditMode ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  <span className="hidden sm:inline">{data.matrixEditMode ? 'Consultation' : 'Édition'}</span>
                </button>
              )}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => data.setMatrixViewMode('cards')}
                  className={`p-2 rounded-md transition-all ${data.matrixViewMode === 'cards' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}
                  title="Vue cartes"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => data.setMatrixViewMode('table')}
                  className={`p-2 rounded-md transition-all ${data.matrixViewMode === 'table' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}
                  title="Vue tableau"
                >
                  <Table className="w-4 h-4" />
                </button>
              </div>
              <button onClick={data.loadData} className="p-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm" title="Rafraîchir">
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Absences Tab Controls */}
          {data.activeTab === 'absences' && (
            <>
              <AbsenceFiltersToolbar data={data} />
              <div className="h-8 w-px bg-gray-300" />
              <button onClick={data.loadData} className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 font-medium shadow-sm">
                <RefreshCw className="w-4 h-4" />
                Rafraîchir
              </button>
              {data.permissions.canCreateAbsence && (
                <button onClick={data.handleOpenCreateAbsence} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm shadow-sm">
                  <Plus className="w-4 h-4" />
                  Absence
                </button>
              )}
            </>
          )}

          {/* Equipes Tab Controls */}
          {data.activeTab === 'equipes' && (
            <>
              <button onClick={data.loadData} className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 font-medium shadow-sm">
                <RefreshCw className="w-4 h-4" />
                Rafraîchir
              </button>
              {data.permissions.canCreateTeam && (
                <button onClick={data.handleOpenCreateTeam} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm shadow-sm">
                  <Plus className="w-4 h-4" />
                  Équipe
                </button>
              )}
            </>
          )}

          {/* Operateurs Tab Controls */}
          {data.activeTab === 'operateurs' && (
            <>
              <OperateurFiltersToolbar data={data} />
              <div className="h-8 w-px bg-gray-300" />
              <button onClick={data.loadData} className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 font-medium shadow-sm">
                <RefreshCw className="w-4 h-4" />
                Rafraîchir
              </button>
              {data.permissions.canCreateOperateur && (
                <button onClick={() => data.setShowCreateOperateur(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm shadow-sm">
                  <Plus className="w-4 h-4" />
                  Opérateur
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Competences Filter Bar */}
      {data.activeTab === 'competences' && <CompetencesFilterBar data={data} />}

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {data.activeTab === 'equipes' && (
          <EquipesTab
            filteredEquipes={data.filteredEquipes}
            equipesTotal={data.equipesTotal}
            equipesPage={data.equipesPage}
            onPageChange={async (page) => { data.setEquipesPage(page); await data.loadEquipesData(page); }}
            onRowClick={(eq) => data.handleViewEquipe(eq.id)}
            onEdit={(eq) => data.setEditEquipe(eq)}
            onDelete={(id) => data.setDeleteEquipeId(id)}
            onView={(id) => data.handleViewEquipe(id)}
            permissions={data.permissions}
          />
        )}

        {data.activeTab === 'operateurs' && (
          <OperateursTab
            filteredOperateurs={data.filteredOperateurs}
            operateursTotal={data.operateursTotal}
            operateursPage={data.operateursPage}
            onPageChange={async (page) => { data.setOperateursPage(page); await data.loadOperateursData(page); }}
            onRowClick={(op) => data.handleViewOperateur(op.id)}
            onEdit={(op) => data.setEditingOperateur(op)}
            onDelete={(id) => data.setDeleteOperateurId(id)}
            onView={(id) => data.handleViewOperateur(id)}
            permissions={data.permissions}
          />
        )}

        {data.activeTab === 'absences' && (
          <AbsencesTab
            filteredAbsences={data.filteredAbsences}
            absencesTotal={data.absencesTotal}
            absencesPage={data.absencesPage}
            onPageChange={async (page) => { data.setAbsencesPage(page); await data.loadAbsencesData(page); }}
            onView={(a) => data.setSelectedAbsence(a)}
            onEdit={(a) => data.setEditingAbsence(a)}
            onDelete={(id) => data.setDeleteAbsenceId(id)}
            onValider={data.handleValiderAbsence}
            onRefuser={data.handleRefuserAbsence}
            permissions={data.permissions}
          />
        )}

        {data.activeTab === 'competences' && (
          <CompetenceMatrix
            operateurs={data.operateurs}
            competences={data.competences}
            searchQuery={data.debouncedSearchQuery}
            viewMode={data.matrixViewMode}
            isEditMode={data.matrixEditMode}
            isReadOnly={data.isReadOnly}
            niveauFilter={data.matrixNiveauFilter}
            categorieFilter={data.matrixCategorieFilter}
            onViewModeChange={data.setMatrixViewMode}
            onEditModeChange={data.setMatrixEditMode}
            onNiveauFilterChange={data.setMatrixNiveauFilter}
            onCategorieFilterChange={data.setMatrixCategorieFilter}
          />
        )}
      </div>

      {/* Modals */}
      <TeamsModals data={data} />
    </div>
  );
};

// ============================================================================
// FILTERS TOOLBAR COMPONENTS
// ============================================================================

const AbsenceFiltersToolbar: React.FC<{ data: ReturnType<typeof useTeamsData> }> = ({ data }) => {
  const hasFilters = data.absenceFilters.statut || data.absenceFilters.typeAbsence || data.absenceFilters.dateDebut || data.absenceFilters.dateFin;

  return (
    <>
      <button
        onClick={() => data.setShowAbsenceFilters(!data.showAbsenceFilters)}
        className={`relative p-2.5 rounded-lg transition-all ${
          data.showAbsenceFilters || hasFilters
            ? 'bg-emerald-600 text-white shadow-md'
            : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400 shadow-sm'
        }`}
        title="Filtres"
      >
        <Filter className="w-4 h-4" />
        {hasFilters && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">
            {(data.absenceFilters.statut ? 1 : 0) + (data.absenceFilters.typeAbsence ? 1 : 0) + (data.absenceFilters.dateDebut ? 1 : 0) + (data.absenceFilters.dateFin ? 1 : 0)}
          </span>
        )}
      </button>

      {data.showAbsenceFilters && (
        <>
          <StatutAbsenceFilter value={data.absenceFilters.statut} onChange={(val) => data.setAbsenceFilters({ ...data.absenceFilters, statut: val })} />
          <TypeAbsenceFilter value={data.absenceFilters.typeAbsence} onChange={(val) => data.setAbsenceFilters({ ...data.absenceFilters, typeAbsence: val })} />
          <input
            type="date"
            value={data.absenceFilters.dateDebut}
            onChange={(e) => data.setAbsenceFilters({ ...data.absenceFilters, dateDebut: e.target.value })}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all hover:border-gray-300 shadow-sm cursor-pointer"
          />
          <input
            type="date"
            value={data.absenceFilters.dateFin}
            onChange={(e) => data.setAbsenceFilters({ ...data.absenceFilters, dateFin: e.target.value })}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all hover:border-gray-300 shadow-sm cursor-pointer"
          />
          {hasFilters && (
            <button
              onClick={() => data.setAbsenceFilters({ statut: '', typeAbsence: '', dateDebut: '', dateFin: '' })}
              className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all border border-red-200 hover:border-red-300 shadow-sm"
              title="Réinitialiser les filtres"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </>
      )}
    </>
  );
};

const OperateurFiltersToolbar: React.FC<{ data: ReturnType<typeof useTeamsData> }> = ({ data }) => {
  const hasFilters = data.operateurFilters.statut || data.operateurFilters.equipe || data.operateurFilters.estChef || data.operateurFilters.disponible;

  const handleFilterChange = (newFilters: typeof data.operateurFilters) => {
    data.setOperateurFilters(newFilters);
    data.setOperateursPage(1);
    data.loadOperateursData(1, newFilters);
  };

  return (
    <>
      <button
        onClick={() => data.setShowOperateurFilters(!data.showOperateurFilters)}
        className={`relative p-2.5 rounded-lg transition-all ${
          data.showOperateurFilters || hasFilters
            ? 'bg-emerald-600 text-white shadow-md'
            : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400 shadow-sm'
        }`}
        title="Filtres"
      >
        <Filter className="w-4 h-4" />
        {hasFilters && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">
            {(data.operateurFilters.statut ? 1 : 0) + (data.operateurFilters.equipe ? 1 : 0) + (data.operateurFilters.estChef ? 1 : 0) + (data.operateurFilters.disponible ? 1 : 0)}
          </span>
        )}
      </button>

      {data.showOperateurFilters && (
        <>
          <StatutOperateurFilter value={data.operateurFilters.statut} onChange={(val) => handleFilterChange({ ...data.operateurFilters, statut: val })} />
          <EquipeFilter value={data.operateurFilters.equipe} equipes={data.equipes} onChange={(val) => handleFilterChange({ ...data.operateurFilters, equipe: val })} />
          <ChefFilter value={data.operateurFilters.estChef} onChange={(val) => handleFilterChange({ ...data.operateurFilters, estChef: val })} />
          <DisponibiliteFilter value={data.operateurFilters.disponible} onChange={(val) => handleFilterChange({ ...data.operateurFilters, disponible: val })} />
          {hasFilters && (
            <button
              onClick={() => handleFilterChange({ statut: '', equipe: '', estChef: '', disponible: '' })}
              className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all border border-red-200 hover:border-red-300 shadow-sm"
              title="Réinitialiser les filtres"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </>
      )}
    </>
  );
};

// ============================================================================
// FILTER SELECT COMPONENTS
// ============================================================================

const StatutAbsenceFilter: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => (
  <Listbox value={value} onChange={onChange}>
    <div className="relative">
      <Listbox.Button className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]">
        <CalendarCheck className="w-4 h-4 text-gray-500" />
        <span className="flex-1 text-left">{value === '' ? 'Statut' : value === 'DEMANDEE' ? 'Demandée' : value === 'VALIDEE' ? 'Validée' : value === 'REFUSEE' ? 'Refusée' : 'Annulée'}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </Listbox.Button>
      <Transition as={React.Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {['', 'DEMANDEE', 'VALIDEE', 'REFUSEE', 'ANNULEE'].map((opt) => (
            <Listbox.Option key={opt} value={opt} className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
              {({ selected }) => (
                <div className="flex items-center gap-2">
                  {opt === 'DEMANDEE' && <Clock className="w-4 h-4 text-orange-500" />}
                  {opt === 'VALIDEE' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {opt === 'REFUSEE' && <XCircle className="w-4 h-4 text-red-500" />}
                  {opt === 'ANNULEE' && <Ban className="w-4 h-4 text-gray-500" />}
                  {opt === '' && <CalendarCheck className="w-4 h-4 text-gray-500" />}
                  <span className={selected ? 'font-semibold' : 'font-normal'}>{opt === '' ? 'Tous statuts' : opt === 'DEMANDEE' ? 'Demandée' : opt === 'VALIDEE' ? 'Validée' : opt === 'REFUSEE' ? 'Refusée' : 'Annulée'}</span>
                </div>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Transition>
    </div>
  </Listbox>
);

const TypeAbsenceFilter: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => (
  <Listbox value={value} onChange={onChange}>
    <div className="relative">
      <Listbox.Button className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]">
        <CalendarClock className="w-4 h-4 text-gray-500" />
        <span className="flex-1 text-left truncate">{value === '' ? 'Type' : value === 'CONGE' ? 'Congé' : value === 'MALADIE' ? 'Maladie' : value === 'FORMATION' ? 'Formation' : 'Autre'}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </Listbox.Button>
      <Transition as={React.Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {['', 'CONGE', 'MALADIE', 'FORMATION', 'AUTRE'].map((opt) => (
            <Listbox.Option key={opt} value={opt} className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
              {({ selected }) => (
                <div className="flex items-center gap-2">
                  {opt === 'CONGE' && <Umbrella className="w-4 h-4 text-blue-500" />}
                  {opt === 'MALADIE' && <HeartPulse className="w-4 h-4 text-red-500" />}
                  {opt === 'FORMATION' && <GraduationCap className="w-4 h-4 text-purple-500" />}
                  {opt === 'AUTRE' && <MoreHorizontal className="w-4 h-4 text-gray-500" />}
                  {opt === '' && <CalendarClock className="w-4 h-4 text-gray-500" />}
                  <span className={selected ? 'font-semibold' : 'font-normal'}>{opt === '' ? 'Tous types' : opt === 'CONGE' ? 'Congé' : opt === 'MALADIE' ? 'Maladie' : opt === 'FORMATION' ? 'Formation' : 'Autre'}</span>
                </div>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Transition>
    </div>
  </Listbox>
);

const StatutOperateurFilter: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => (
  <Listbox value={value} onChange={onChange}>
    <div className="relative">
      <Listbox.Button className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[130px]">
        <UserCheck className="w-4 h-4 text-gray-500" />
        <span className="flex-1 text-left">{value === '' ? 'Statut' : value === 'ACTIF' ? 'Actif' : value === 'INACTIF' ? 'Inactif' : 'En congé'}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </Listbox.Button>
      <Transition as={React.Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {['', 'ACTIF', 'INACTIF', 'EN_CONGE'].map((opt) => (
            <Listbox.Option key={opt} value={opt} className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
              {({ selected }) => (
                <div className="flex items-center gap-2">
                  {opt !== '' && <span className={`w-2 h-2 rounded-full ${opt === 'ACTIF' ? 'bg-green-500' : opt === 'INACTIF' ? 'bg-gray-400' : 'bg-yellow-500'}`} />}
                  <span className={selected ? 'font-semibold' : 'font-normal'}>{opt === '' ? 'Tous statuts' : opt === 'ACTIF' ? 'Actif' : opt === 'INACTIF' ? 'Inactif' : 'En congé'}</span>
                </div>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Transition>
    </div>
  </Listbox>
);

const EquipeFilter: React.FC<{ value: string; equipes: { id: number; nomEquipe: string; actif: boolean }[]; onChange: (val: string) => void }> = ({ value, equipes, onChange }) => (
  <Listbox value={value} onChange={onChange}>
    <div className="relative">
      <Listbox.Button className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]">
        <Users className="w-4 h-4 text-gray-500" />
        <span className="flex-1 text-left truncate">{value === '' ? 'Équipe' : value === 'sans_equipe' ? 'Sans équipe' : equipes.find(e => e.id === parseInt(value))?.nomEquipe || 'Équipe'}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </Listbox.Button>
      <Transition as={React.Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-48 overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <Listbox.Option value="" className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
            {({ selected }) => <span className={selected ? 'font-semibold' : 'font-normal'}>Toutes équipes</span>}
          </Listbox.Option>
          <Listbox.Option value="sans_equipe" className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
            {({ selected }) => (
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-gray-400" />
                <span className={selected ? 'font-semibold' : 'font-normal'}>Sans équipe</span>
              </div>
            )}
          </Listbox.Option>
          {equipes.filter(e => e.actif).map(eq => (
            <Listbox.Option key={eq.id} value={String(eq.id)} className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
              {({ selected }) => <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>{eq.nomEquipe}</span>}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Transition>
    </div>
  </Listbox>
);

const ChefFilter: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => (
  <Listbox value={value} onChange={onChange}>
    <div className="relative">
      <Listbox.Button className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]">
        <Star className="w-4 h-4 text-gray-500" />
        <span className="flex-1 text-left">{value === '' ? "Chef d'équipe" : value === 'true' ? 'Chefs uniquement' : 'Non-chefs'}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </Listbox.Button>
      <Transition as={React.Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <Listbox.Option value="" className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
            {({ selected }) => <span className={selected ? 'font-semibold' : 'font-normal'}>Tous</span>}
          </Listbox.Option>
          <Listbox.Option value="true" className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
            {({ selected }) => (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className={selected ? 'font-semibold' : 'font-normal'}>Chefs d'équipe</span>
              </div>
            )}
          </Listbox.Option>
          <Listbox.Option value="false" className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
            {({ selected }) => (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className={selected ? 'font-semibold' : 'font-normal'}>Membres uniquement</span>
              </div>
            )}
          </Listbox.Option>
        </Listbox.Options>
      </Transition>
    </div>
  </Listbox>
);

const DisponibiliteFilter: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => (
  <Listbox value={value} onChange={onChange}>
    <div className="relative">
      <Listbox.Button className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]">
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="flex-1 text-left">{value === '' ? 'Disponibilité' : value === 'true' ? 'Disponibles' : 'Indisponibles'}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </Listbox.Button>
      <Transition as={React.Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <Listbox.Option value="" className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
            {({ selected }) => <span className={selected ? 'font-semibold' : 'font-normal'}>Tous</span>}
          </Listbox.Option>
          <Listbox.Option value="true" className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
            {({ selected }) => (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className={selected ? 'font-semibold' : 'font-normal'}>Disponibles aujourd'hui</span>
              </div>
            )}
          </Listbox.Option>
          <Listbox.Option value="false" className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
            {({ selected }) => (
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className={selected ? 'font-semibold' : 'font-normal'}>Indisponibles</span>
              </div>
            )}
          </Listbox.Option>
        </Listbox.Options>
      </Transition>
    </div>
  </Listbox>
);

// ============================================================================
// COMPETENCES FILTER BAR
// ============================================================================

const CompetencesFilterBar: React.FC<{ data: ReturnType<typeof useTeamsData> }> = ({ data }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-shrink-0">
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
        <Filter className="w-4 h-4" />
        <span>Filtrer par :</span>
      </div>

      {/* Niveau Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Niveau</span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { val: '' as const, label: 'Tous', color: 'bg-gray-800 text-white', inactiveColor: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
            { val: 'NON' as NiveauCompetence, label: 'Aucune', icon: <Ban className="w-3 h-3" />, color: 'bg-red-500 text-white', inactiveColor: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' },
            { val: 'DEBUTANT' as NiveauCompetence, label: 'Débutant', icon: <Star className="w-3 h-3" />, color: 'bg-orange-500 text-white', inactiveColor: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200' },
            { val: 'INTERMEDIAIRE' as NiveauCompetence, label: 'Intermédiaire', icon: <TrendingUp className="w-3 h-3" />, color: 'bg-blue-500 text-white', inactiveColor: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' },
            { val: 'EXPERT' as NiveauCompetence, label: 'Expert', icon: <CheckCircle className="w-3 h-3" />, color: 'bg-green-500 text-white', inactiveColor: 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => data.setMatrixNiveauFilter(item.val)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                data.matrixNiveauFilter === item.val ? `${item.color} shadow-sm` : item.inactiveColor
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-8 w-px bg-gray-200 hidden md:block" />

      {/* Catégorie Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Catégorie</span>
        <Listbox value={data.matrixCategorieFilter} onChange={data.setMatrixCategorieFilter}>
          <div className="relative">
            <Listbox.Button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-full text-xs font-medium text-gray-700 bg-white hover:border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all cursor-pointer min-w-[140px]">
              <FolderOpen className="w-3.5 h-3.5 text-gray-500" />
              <span className="flex-1 text-left truncate">{data.matrixCategorieFilter || 'Toutes'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </Listbox.Button>
            <Transition as={React.Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-48 overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <Listbox.Option value="" className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
                  {({ selected }) => (
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-gray-500" />
                      <span className={selected ? 'font-semibold' : 'font-normal'}>Toutes les catégories</span>
                    </div>
                  )}
                </Listbox.Option>
                {data.competenceCategories.map(cat => (
                  <Listbox.Option key={cat} value={cat} className={({ active }) => `relative cursor-pointer select-none py-2 px-3 ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-900'}`}>
                    {({ selected }) => <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>{cat}</span>}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
      </div>

      {(data.matrixNiveauFilter || data.matrixCategorieFilter) && (
        <>
          <button
            onClick={() => { data.setMatrixNiveauFilter(''); data.setMatrixCategorieFilter(''); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-full transition-all border border-red-200"
          >
            <X className="w-3 h-3" />
            Réinitialiser
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {(data.matrixNiveauFilter ? 1 : 0) + (data.matrixCategorieFilter ? 1 : 0)} filtre{((data.matrixNiveauFilter ? 1 : 0) + (data.matrixCategorieFilter ? 1 : 0)) > 1 ? 's' : ''} actif{((data.matrixNiveauFilter ? 1 : 0) + (data.matrixCategorieFilter ? 1 : 0)) > 1 ? 's' : ''}
            </span>
          </div>
        </>
      )}
    </div>
  </div>
);

// ============================================================================
// MODALS COMPONENT
// ============================================================================

const TeamsModals: React.FC<{ data: ReturnType<typeof useTeamsData> }> = ({ data }) => (
  <>
    {data.showCreateTeam && (
      <CreateTeamModal
        onClose={() => data.setShowCreateTeam(false)}
        onCreated={data.loadData}
        chefsPotentiels={data.chefsPotentiels}
        operateursSansEquipe={data.operateursSansEquipe}
      />
    )}

    {data.showCreateOperateur && (
      <CreateOperateurModal
        onClose={() => data.setShowCreateOperateur(false)}
        onCreated={data.loadData}
      />
    )}

    {data.selectedEquipe && (
      <EquipeDetailModal
        equipe={data.selectedEquipe}
        onClose={() => data.setSelectedEquipe(null)}
      />
    )}

    {data.editingUser && (
      <EditUserModal
        user={data.editingUser}
        clients={data.clients}
        operateurs={data.operateurs}
        onClose={() => data.setEditingUser(null)}
        onUpdated={data.loadData}
      />
    )}

    {data.editingOperateur && (
      <EditOperateurModal
        operateur={data.editingOperateur}
        onClose={() => data.setEditingOperateur(null)}
        onUpdated={data.loadData}
      />
    )}

    {data.editEquipe && (
      <EditEquipeModal
        equipe={data.editEquipe}
        onClose={() => data.setEditEquipe(null)}
        onSaved={data.loadData}
      />
    )}

    {data.deleteEquipeId !== null && (
      <ConfirmDeleteModal
        isOpen={true}
        title="Supprimer l'équipe ?"
        message="Cette action est irréversible."
        onConfirm={() => data.handleDeleteEquipe(data.deleteEquipeId!)}
        onClose={() => data.setDeleteEquipeId(null)}
      />
    )}

    {data.deleteOperateurId !== null && (
      <ConfirmDeleteModal
        isOpen={true}
        title="Supprimer l'opérateur ?"
        message="Cette action est irréversible."
        onConfirm={() => data.handleDeleteOperateur(data.deleteOperateurId!)}
        onClose={() => data.setDeleteOperateurId(null)}
      />
    )}

    {data.showCreateAbsence && (
      <CreateAbsenceModal
        operateurs={data.operateurs}
        onClose={() => data.setShowCreateAbsence(false)}
        onCreated={data.loadData}
      />
    )}

    {data.selectedAbsence && (
      <AbsenceDetailModal
        absence={data.selectedAbsence}
        onClose={() => data.setSelectedAbsence(null)}
      />
    )}

    {data.editingAbsence && (
      <EditAbsenceModal
        absence={data.editingAbsence}
        onClose={() => data.setEditingAbsence(null)}
        onUpdated={data.loadData}
      />
    )}

    {data.deleteAbsenceId !== null && (
      <ConfirmDeleteModal
        isOpen={true}
        title="Annuler l'absence ?"
        message="L'absence sera marquée comme annulée. Cette action ne peut pas être annulée."
        onConfirm={() => data.handleAnnulerAbsence(data.deleteAbsenceId!)}
        onClose={() => data.setDeleteAbsenceId(null)}
        confirmText="Annuler l'absence"
      />
    )}

    {data.selectedOperateur && (
      <OperateurDetailModal
        operateur={data.selectedOperateur}
        onClose={() => data.setSelectedOperateur(null)}
      />
    )}
  </>
);

export default Teams;
