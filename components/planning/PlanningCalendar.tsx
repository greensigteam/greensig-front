import React, { FC, useMemo, useCallback, useState, useRef } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar';
import withDragAndDrop, { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Calendar as CalendarIcon, CheckCircle2, X, ChevronRight } from 'lucide-react';
import { Tache } from '../../types/planning';
import { TaskEvent, CalendarEvent } from './TaskEvent';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// ============================================================================
// CONFIGURATION
// ============================================================================

const locales = { fr: fr };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DnDCalendar = withDragAndDrop<CalendarEvent>(BigCalendar);

// ============================================================================
// TYPES
// ============================================================================

interface PlanningCalendarProps {
  filteredTaches: Tache[];
  currentDate: Date;
  currentView: string;
  slideDirection: 'left' | 'right' | null;
  isReadOnly: boolean;
  calendarRef: React.RefObject<HTMLDivElement | null>;

  // Handlers
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
  onSelectEvent: (event: CalendarEvent, e: React.SyntheticEvent) => void;
  onNavigate: (date: Date) => void;
  onView: (view: string) => void;
  onEventDrop?: (args: EventInteractionArgs<CalendarEvent>) => void;
  onEventResize?: (args: EventInteractionArgs<CalendarEvent>) => void;
}

// ============================================================================
// LEGEND COMPONENT
// ============================================================================

// ============================================================================
// EXPANDED DAY MODAL
// ============================================================================

interface ExpandedDayModalProps {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onSelectEvent: (event: CalendarEvent, e: React.SyntheticEvent) => void;
  anchorEl: HTMLElement | null;
}

const ExpandedDayModal: FC<ExpandedDayModalProps> = ({
  date,
  events,
  onClose,
  onSelectEvent,
  anchorEl,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Calculate position
  const modalStyle = useMemo(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const modalWidth = 400;
    const modalMaxHeight = 480;

    let left: number;
    let top: number;

    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      left = rect.left;
      top = rect.bottom + 8;

      // Adjust if overflowing right
      if (left + modalWidth > viewportWidth - 20) {
        left = viewportWidth - modalWidth - 20;
      }

      // Adjust if overflowing bottom - show above instead
      if (top + modalMaxHeight > viewportHeight - 20) {
        top = rect.top - modalMaxHeight - 8;
        if (top < 20) top = 20;
      }
    } else {
      // Center the modal when no anchor
      left = (viewportWidth - modalWidth) / 2;
      top = (viewportHeight - modalMaxHeight) / 2;
    }

    // Ensure not too far left
    if (left < 20) left = 20;

    return {
      position: 'fixed' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${modalWidth}px`,
      maxHeight: `${modalMaxHeight}px`,
      zIndex: 9999,
    };
  }, [anchorEl]);

  // Group events by unique task ID
  const uniqueEvents = useMemo(() => {
    const seen = new Set<number>();
    return events.filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
  }, [events]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]" onClick={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden"
        style={{
          ...modalStyle,
          animation: 'expandIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg capitalize">
                  {format(date, 'EEEE d', { locale: fr })}
                </h3>
                <p className="text-emerald-100 text-sm capitalize">
                  {format(date, 'MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all hover:scale-105"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Task count */}
        <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-emerald-50/30 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full">
                {uniqueEvents.length}
              </span>
              <span className="text-sm text-gray-600">
                tâche{uniqueEvents.length > 1 ? 's' : ''} planifiée
                {uniqueEvents.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable task list */}
        <div className="overflow-y-auto max-h-[320px] p-4 space-y-3 custom-scrollbar bg-gray-50/50">
          {uniqueEvents.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Aucune tâche ce jour</p>
            </div>
          ) : (
            uniqueEvents.map((event, index) => (
              <div
                key={`${event.id}-${index}`}
                onClick={(e) => {
                  onSelectEvent(event, e);
                  onClose();
                }}
                className="group cursor-pointer bg-white hover:bg-emerald-50/50 rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                <div className="p-3">
                  <TaskEvent event={event} />
                </div>
                <div className="px-3 pb-2.5 flex items-center justify-end">
                  <span className="text-xs text-gray-400 group-hover:text-emerald-600 flex items-center gap-1 transition-colors">
                    Cliquer pour détails
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

// ============================================================================
// LEGEND COMPONENT
// ============================================================================

export const PlanningLegend: FC = () => (
  <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
    <div className="flex items-center gap-6 text-xs">
      <span className="font-medium text-gray-600">Légende:</span>

      {/* Tâche planifiée */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border-l-4 border-gray-400 bg-gradient-to-r from-gray-50 to-transparent">
          <CalendarIcon className="w-3 h-3 text-gray-500" />
          <span className="text-gray-700">Tâche planifiée</span>
        </div>
      </div>

      {/* Distribution (Dashed) */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border-l-4 border-gray-400 border-dashed bg-white">
          <Clock className="w-3 h-3 text-blue-600" />
          <span className="text-gray-700">Distribution planifiée</span>
        </div>
      </div>

      {/* Réalisée / Terminée */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border-l-4 border-emerald-500 bg-emerald-50">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span className="text-gray-700">Terminée / Réalisée</span>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PlanningCalendar: FC<PlanningCalendarProps> = ({
  filteredTaches,
  currentDate,
  currentView,
  slideDirection,
  isReadOnly,
  calendarRef,
  onSelectSlot,
  onSelectEvent,
  onNavigate,
  onView,
  onEventDrop,
  onEventResize,
}) => {
  // State for expanded day modal
  const [expandedDate, setExpandedDate] = useState<Date | null>(null);
  const [expandAnchorEl, setExpandAnchorEl] = useState<HTMLElement | null>(null);

  // Convert tasks to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    const result = filteredTaches.flatMap((t) => {
      // Case 1: Task with distributions
      if (t.distributions_charge && t.distributions_charge.length > 0) {
        return t.distributions_charge.map((dist) => {
          const [year = 0, month = 0, day = 0] = dist.date.split('-').map(Number);

          const startTime = dist.heure_debut || '08:00:00';
          const endTime = dist.heure_fin || '17:00:00';

          const [sh = 0, sm = 0] = startTime.split(':').map(Number);
          const [eh = 0, em = 0] = endTime.split(':').map(Number);

          const start = new Date(year, month - 1, day, sh, sm, 0);
          const end = new Date(year, month - 1, day, eh, em, 0);

          // In month view, hide distribution identity to show task mode
          const isMonthView = currentView === 'month';

          return {
            id: t.id,
            title: t.type_tache_detail.nom_tache,
            start,
            end,
            resource: t,
            distributionStatus: isMonthView ? undefined : dist.status,
            distributionId: isMonthView ? undefined : dist.id,
          };
        });
      }

      // Case 2: Task without distributions
      const startDate = new Date(t.date_debut_planifiee);
      const endDate = new Date(t.date_fin_planifiee);

      if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
        startDate.setHours(8, 0, 0);
      }
      if (endDate.getHours() === 0 && endDate.getMinutes() === 0) {
        endDate.setHours(17, 0, 0);
      }

      return [
        {
          id: t.id,
          title: t.type_tache_detail.nom_tache,
          start: startDate,
          end: endDate,
          resource: t,
        },
      ];
    });
    return result;
  }, [filteredTaches, currentView]);

  // Custom Event Prop Getter to make RBC events transparent
  const eventPropGetter = useCallback(
    () => ({
      style: { backgroundColor: 'transparent', boxShadow: 'none', padding: 0, border: 'none' },
    }),
    [],
  );

  // Get events for expanded date
  const expandedDateEvents = useMemo(() => {
    if (!expandedDate) return [];
    return events.filter((event) => isSameDay(event.start, expandedDate));
  }, [events, expandedDate]);

  // Handle "show more" click - open our custom modal instead of RBC popup
  const handleShowMore = useCallback((_events: CalendarEvent[], date: Date) => {
    // Simply open the modal - it will be centered if no anchor
    // The date is what matters most
    setExpandAnchorEl(null);
    setExpandedDate(date);
  }, []);

  // Handle drilldown (clicking on a date number or "show more")
  const handleDrillDown = useCallback(
    (date: Date, view: string, e?: React.SyntheticEvent) => {
      // In month view, don't switch to day view - show our modal instead
      if (currentView === 'month' && e) {
        const target = e.currentTarget as HTMLElement;
        // Find the cell wrapper
        const cell = target.closest('.rbc-date-cell') || target.closest('.rbc-day-bg') || target;
        setExpandAnchorEl(cell as HTMLElement);
        setExpandedDate(date);
      } else {
        // For other views, navigate normally
        onNavigate(date);
        if (view !== currentView) {
          onView(view);
        }
      }
    },
    [currentView, onNavigate, onView],
  );

  // Close expanded modal
  const handleCloseExpanded = useCallback(() => {
    setExpandedDate(null);
    setExpandAnchorEl(null);
  }, []);

  return (
    <div
      className={`h-full flex flex-col transition-opacity duration-300 ${slideDirection === 'right' ? 'animate-slide-right' : slideDirection === 'left' ? 'animate-slide-left' : ''}`}
      ref={calendarRef}
      key={currentDate.toString() + currentView}
    >
      {/* Scrollable container - vertical and horizontal */}
      <div className="flex-1 overflow-auto p-2 md:p-4">
        <div className="min-w-[600px] min-h-[500px] h-full">
          <DnDCalendar
            components={{
              event: TaskEvent,
            }}
            localizer={localizer}
            events={events}
            popup={false}
            startAccessor="start"
            endAccessor="end"
            length={1}
            style={{ height: '100%' }}
            messages={{
              next: 'Suivant',
              previous: 'Précédent',
              today: "Aujourd'hui",
              month: 'Mois',
              week: 'Semaine',
              day: 'Jour',
              agenda: 'Agenda',
              date: 'Date',
              time: 'Heure',
              event: 'Événement',
              noEventsInRange: 'Aucune tâche.',
              showMore: (count: number) => `+${count} tâche${count > 1 ? 's' : ''}`,
            }}
            culture="fr"
            min={new Date(2024, 0, 1, 7, 0, 0)}
            max={new Date(2024, 0, 1, 19, 0, 0)}
            step={30}
            timeslots={2}
            selectable={!isReadOnly}
            onSelectSlot={onSelectSlot}
            onSelectEvent={onSelectEvent}
            onShowMore={handleShowMore}
            onDrillDown={handleDrillDown}
            views={['month', 'week', 'day', 'agenda']}
            onEventDrop={isReadOnly ? undefined : onEventDrop}
            onEventResize={isReadOnly ? undefined : onEventResize}
            resizable={!isReadOnly}
            draggableAccessor={() => !isReadOnly}
            date={currentDate}
            view={currentView as View}
            onNavigate={onNavigate}
            onView={onView as (view: View) => void}
            toolbar={false}
            eventPropGetter={eventPropGetter}
            doShowMoreDrillDown={false}
          />
        </div>
      </div>

      {/* Expanded Day Modal */}
      {expandedDate && currentView === 'month' && (
        <ExpandedDayModal
          date={expandedDate}
          events={expandedDateEvents}
          onClose={handleCloseExpanded}
          onSelectEvent={onSelectEvent}
          anchorEl={expandAnchorEl}
        />
      )}
    </div>
  );
};

export default PlanningCalendar;
