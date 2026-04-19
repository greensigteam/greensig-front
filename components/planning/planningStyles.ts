export const customCalendarStyles = `
    /* Animations */
    @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideInLeft { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes genieAppear {
        0% { transform: scale(0); opacity: 0; }
        60% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
    }
    @keyframes checkBurst { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
    @keyframes expandIn {
        0% { transform: scale(0.9) translateY(-10px); opacity: 0; }
        100% { transform: scale(1) translateY(0); opacity: 1; }
    }

    .animate-slide-right .rbc-month-view, .animate-slide-right .rbc-time-view { animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
    .animate-slide-left .rbc-month-view, .animate-slide-left .rbc-time-view { animation: slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
    .animate-popover { animation: genieAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    .animate-check { animation: checkBurst 0.3s ease-out; }

    /* Global RBC Overrides */
    .rbc-calendar { font-family: 'Inter', system-ui, sans-serif; color: #3c4043; }
    .rbc-header { border-bottom: none !important; padding: 12px 0 !important; font-size: 11px; font-weight: 600; color: #70757a; text-transform: uppercase; }
    .rbc-month-view { border: none !important; }
    .rbc-day-bg { border-left: 1px solid #f1f3f4 !important; transition: background-color 0.15s ease; }
    .rbc-day-bg:hover { background-color: #f8fffe !important; }
    .rbc-month-row { border-top: 1px solid #f1f3f4 !important; }
    .rbc-off-range-bg { background-color: #fcfcfc !important; }
    .rbc-date-cell { padding: 8px !important; font-size: 12px; font-weight: 500; color: #3c4043; text-align: center; cursor: pointer; transition: all 0.15s ease; }
    .rbc-date-cell:hover { background-color: #ecfdf5; }
    .rbc-date-cell .rbc-button-link { transition: all 0.15s ease; }
    .rbc-date-cell:hover .rbc-button-link { color: #059669; transform: scale(1.1); }

    /* Aujourd'hui */
    .rbc-today { background-color: #f0fdf4 !important; }
    .rbc-now .rbc-button-link { background-color: #10b981; color: white; border-radius: 50%; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; margin-top: -4px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35); font-weight: 600; }

    /* Vue Mois - Ajustements améliorés */
    .rbc-month-view .rbc-row-content {
        overflow: visible !important;
        position: relative;
    }
    .rbc-month-row {
        min-height: 140px !important;
        overflow: visible !important;
    }
    .rbc-month-view .rbc-row-segment {
        padding: 1px 4px !important;
    }
    .rbc-month-view .rbc-event {
        margin-bottom: 2px !important;
        height: auto !important;
        max-height: none !important;
        min-height: 28px !important;
        line-height: normal !important;
    }
    .rbc-month-view .rbc-event-content {
        height: auto !important;
        overflow: visible !important;
        white-space: normal !important;
    }
    .rbc-month-view .rbc-row-content .rbc-row {
        min-height: 32px !important;
    }

    /* TaskEvent compact en vue mois */
    .rbc-month-view .task-event-root {
        padding: 2px 6px !important;
        gap: 4px !important;
        min-height: 24px !important;
        height: auto !important;
    }
    .rbc-month-view .task-event-root > div:first-child {
        /* Checkbox plus petite */
        width: 12px !important;
        height: 12px !important;
        min-width: 12px !important;
        margin-top: 2px !important;
    }
    .rbc-month-view .task-event-root > div:first-child svg {
        width: 8px !important;
        height: 8px !important;
    }
    .rbc-month-view .task-event-content {
        gap: 0 !important;
    }
    .rbc-month-view .task-event-content > div:first-child {
        /* Ligne titre */
        gap: 4px !important;
    }
    .rbc-month-view .task-event-content > div:first-child svg {
        width: 10px !important;
        height: 10px !important;
    }
    .rbc-month-view .task-event-content > div:first-child > span:first-of-type {
        /* Titre */
        font-size: 11px !important;
        line-height: 1.2 !important;
    }
    .rbc-month-view .task-event-content > div:last-child {
        /* Métadonnées - masquer en vue mois pour gagner de l'espace */
        display: none !important;
    }

    /* Le bouton "Show More" - Design moderne */
    .rbc-show-more {
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%) !important;
        color: #047857 !important;
        font-weight: 700 !important;
        font-size: 11px !important;
        padding: 4px 10px !important;
        border-radius: 8px !important;
        margin-top: 4px !important;
        text-decoration: none !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        width: auto !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 1px 3px rgba(5, 150, 105, 0.15) !important;
        cursor: pointer !important;
    }
    .rbc-show-more:hover {
        background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 3px 8px rgba(5, 150, 105, 0.25) !important;
    }
    .rbc-show-more::after {
        content: '→';
        font-size: 10px;
        opacity: 0.7;
    }

    /* Événements Transparents */
    .rbc-event {
        background-color: transparent !important;
        padding: 0 !important;
        border-radius: 0 !important;
        outline: none !important;
        box-shadow: none !important;
        overflow: visible !important;
        border: none !important;
    }
    .rbc-event:focus { outline: none !important; }
    .rbc-event-label { display: none !important; }
    .rbc-event-content {
        overflow: visible !important;
        height: auto !important;
    }

    /* Time View */
    .rbc-time-header { border-bottom: 1px solid #dadce0 !important; }
    .rbc-time-content { border-top: none !important; }
    .rbc-timeslot-group { border-bottom: 1px solid #f1f3f4 !important; }
    .rbc-time-view { border: none !important; }
    .rbc-day-slot .rbc-time-slot { border-top: 1px solid #f8f9fa !important; }
    .rbc-current-time-indicator { background-color: #ea4335 !important; height: 2px !important; }

    /* Custom Scrollbar for expanded modal */
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }

    /* ========================
       RESPONSIVE CALENDAR
       ======================== */

    /* Mobile: Smaller cells and text */
    @media (max-width: 767px) {
        .rbc-calendar {
            font-size: 12px;
        }
        .rbc-header {
            padding: 8px 0 !important;
            font-size: 9px;
        }
        .rbc-month-row {
            min-height: 100px !important;
        }
        .rbc-date-cell {
            padding: 4px !important;
            font-size: 11px;
        }
        .rbc-now .rbc-button-link {
            width: 22px;
            height: 22px;
            font-size: 11px;
        }
        .rbc-month-view .rbc-event {
            margin-bottom: 1px !important;
            min-height: 22px !important;
        }
        .rbc-row-segment {
            padding: 0 2px !important;
        }
        .rbc-show-more {
            font-size: 9px !important;
            padding: 3px 6px !important;
        }
        /* TaskEvent encore plus compact sur mobile */
        .rbc-month-view .task-event-root {
            padding: 1px 4px !important;
            gap: 3px !important;
            min-height: 20px !important;
        }
        .rbc-month-view .task-event-content > div:first-child > span:first-of-type {
            font-size: 10px !important;
        }
    }

    /* Extra small screens */
    @media (max-width: 400px) {
        .rbc-header {
            font-size: 8px;
            padding: 6px 0 !important;
        }
        .rbc-date-cell {
            padding: 2px !important;
            font-size: 10px;
        }
        .rbc-month-row {
            min-height: 80px !important;
        }
        .rbc-show-more {
            font-size: 8px !important;
            padding: 2px 4px !important;
        }
        .rbc-show-more::after {
            display: none;
        }
        /* TaskEvent minimal sur très petit écran */
        .rbc-month-view .task-event-root {
            padding: 1px 3px !important;
            min-height: 18px !important;
        }
        .rbc-month-view .task-event-root > div:first-child {
            width: 10px !important;
            height: 10px !important;
            min-width: 10px !important;
        }
        .rbc-month-view .task-event-content > div:first-child > span:first-of-type {
            font-size: 9px !important;
        }
        .rbc-month-view .task-event-content > div:first-child svg {
            width: 8px !important;
            height: 8px !important;
        }
    }

    /* Tablet adjustments */
    @media (min-width: 768px) and (max-width: 1023px) {
        .rbc-month-row {
            min-height: 100px !important;
        }
        .rbc-header {
            font-size: 10px;
        }
    }
`;
