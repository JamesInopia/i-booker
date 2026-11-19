// Content for the Help button's page tours.

export type Placement = "top" | "bottom" | "left" | "right";

export type TourStep = {
  target?: string;
  title: string;
  body: string;
  placement?: Placement;
};

export type Tour = {
  /** Stable id, used to remember that the person has already opened this page's tour. */
  id: string;
  steps: TourStep[];
};

type Params = { get(name: string): string | null };

const NAV: TourStep = {
  target: 'nav[aria-label="Main"]',
  placement: "right",
  title: "Main menu",
  body: "Switch between sections here. You only see the sections your account can use.",
};

const TABS: TourStep = {
  target: 'nav[aria-label="Page tabs"]',
  placement: "bottom",
  title: "Page tabs",
  body: "This page is split into tabs. Pick one to change what the page shows.",
};

const BELL: TourStep = {
  target: 'button[aria-label^="Notifications"]',
  placement: "bottom",
  title: "Notifications",
  body: "Updates about requests appear here. A badge means there is something you haven't read yet.",
};

const PROFILE: TourStep = {
  target: 'button[aria-label="Profile menu"]',
  placement: "bottom",
  title: "Your account",
  body: "Open this to log out when you're done.",
};

const HELP: TourStep = {
  target: '[data-tour="help-button"]',
  placement: "right",
  title: "Need a reminder?",
  body: "Click Help any time to replay the tour for the page you're on.",
};

const WELCOME: TourStep = {
  title: "Welcome to i-Booker",
  body: "Reserve rooms and keep track of your requests. Here's a quick look at the main controls.",
};

/** Menus, notifications and account: the same on every page. Also the fallback for pages without their own tour. */
export const BASICS_TOUR: Tour = {
  id: "basics",
  steps: [WELCOME, NAV, TABS, BELL, PROFILE, HELP],
};

const LEGEND: TourStep = {
  target: 'aside[aria-label="Legend"]',
  placement: "left",
  title: "Legend",
  body: "Explains the colors, symbols and dots on the calendar. A green dot means rooms are free that day; the other dot means only the evening block is left.",
};

const page = (id: string, intro: TourStep, ...steps: TourStep[]): Tour => ({
  id,
  steps: [intro, ...steps, TABS, HELP],
});

const TOURS = {
  timelineMonth: page(
    "admin-timeline-month",
    {
      title: "Timeline",
      body: "A calendar of everything happening in the rooms, so you can see how busy each day is.",
    },
    {
      target: '[data-tour="summary-counts"]',
      placement: "bottom",
      title: "Request totals",
      body: "How many booking requests there are in total, how many are already on the schedule, and how many are waiting for review or approval.",
    },
    {
      target: '[data-tour="calendar"]',
      placement: "right",
      title: "Month calendar",
      body: "Use the arrows, or click the month name, to change month. Click a day to open its week timetable, or to mark it as a holiday, no classes, class cancelled or no booking.",
    },
    LEGEND,
  ),

  timelineWeek: page(
    "admin-timeline-week",
    {
      title: "Weekly timetable",
      body: "The same timeline, one week at a time and room by room.",
    },
    {
      target: '[data-tour="timetable"]',
      placement: "top",
      title: "Rooms and times",
      body: "Each column is a day and each row a time. You'll see classes and approved bookings. Use the arrows to change week, or the month name to go back to the calendar.",
    },
    LEGEND,
  ),

  schedule: page(
    "admin-schedule",
    {
      title: "Schedule",
      body: "Set up each term's weekly class schedule, so rooms that are in use for classes can't be booked.",
    },
    {
      target: '[data-tour="planner"]',
      placement: "left",
      title: "Class planner",
      body: "Name the term, set its dates, then use + Add class to put classes into rooms. Classes repeat weekly. Nothing is stored until you press Save Changes, and you'll get a warning if you try to leave with unsaved changes.",
    },
    {
      target: '[data-tour="term-sidebar"]',
      placement: "right",
      title: "Terms",
      body: "Pick a term to edit its schedule, or create a new one.",
    },
  ),

  review: page(
    "admin-review",
    {
      title: "Review",
      body: "Booking requests from requestors arrive here. Open one to read it, then approve or reject it.",
    },
    {
      target: '[data-tour="summary-counts"]',
      placement: "bottom",
      title: "Request totals",
      body: "A running count of requests by stage, so you can see what still needs attention.",
    },
    {
      target: '[data-tour="filters"]',
      placement: "bottom",
      title: "Sort, filter and search",
      body: "Change the order, choose which requests to show, or search for a booking.",
    },
    {
      target: '[data-tour="table"]',
      placement: "top",
      title: "Requests",
      body: "Click a request to open its full details. Tick the boxes to select several at once; buttons to print or download them appear under the list.",
    },
  ),

  reviewDetail: page(
    "admin-review-detail",
    {
      title: "Request details",
      body: "One request in full. Check it over, then decide what to do with it.",
    },
    {
      target: '[data-tour="request-details"]',
      placement: "left",
      title: "What was requested",
      body: "The room, date and time, purpose and the requestor's details. The buttons at the bottom let you approve, reject or cancel the request (only supervisors can approve).",
    },
  ),

  accounts: page(
    "admin-accounts",
    {
      title: "Accounts",
      body: "Control who can sign in to i-Booker and what level of access they have.",
    },
    {
      target: '[data-tour="filters"]',
      placement: "bottom",
      title: "Find an account",
      body: "Show a certain kind of account, or search by name.",
    },
    {
      target: '[data-tour="table"]',
      placement: "top",
      title: "Account list",
      body: "Use the Actions menu on a row to change a person's access, or to suspend or restore their account.",
    },
  ),

  rooms: page(
    "booking-rooms",
    {
      title: "Book a room",
      body: "Browse the rooms you can reserve. A booking takes three short steps: pick a date and time, fill in details, then review and submit.",
    },
    {
      target: '[data-tour="search"]',
      placement: "bottom",
      title: "Search",
      body: "Type part of a room's name to narrow the list.",
    },
    {
      target: '[data-tour="room-grid"]',
      placement: "top",
      title: "Rooms",
      body: "Each card is a room. More Info shows photos and details. Book Room starts your request; it's greyed out when a room isn't available.",
    },
  ),

  manageRooms: page(
    "booking-manage-rooms",
    {
      title: "Manage rooms",
      body: "Add, edit or remove the rooms that people can book.",
    },
    {
      target: '[data-tour="search"]',
      placement: "bottom",
      title: "Search",
      body: "Find a room by name.",
    },
    {
      target: '[data-tour="add-room"]',
      placement: "bottom",
      title: "Add a room",
      body: "Opens a form for the room's name, description and photos. The new room shows up for booking once it's saved.",
    },
    {
      target: '[data-tour="table"]',
      placement: "top",
      title: "Your rooms",
      body: "Each row is a room. Use the menu at the end of a row to edit or delete it.",
    },
  ),

  bookingDate: page(
    "booking-date",
    {
      title: "Step 1: date and time",
      body: "Choose the day you need the room, then the time blocks you want.",
    },
    {
      target: 'ol[aria-label="Booking progress"]',
      placement: "bottom",
      title: "Your progress",
      body: "A booking has three steps. This bar shows where you are.",
    },
    LEGEND,
    {
      target: '[data-tour="date-calendar"]',
      placement: "right",
      title: "Pick a date",
      body: "Choose a day on the calendar. Days marked as closed, such as holidays, can't be booked.",
    },
    {
      target: 'section[aria-label="Time selection"]',
      placement: "left",
      title: "Pick time blocks",
      body: "Bookings are made in four blocks: 7:30 to 11:00 AM, 11:00 AM to 2:30 PM, 2:30 to 6:00 PM and 6:00 to 9:30 PM. Pick as many as you need. Blocks that are already taken can't be chosen, and you'll see a warning if your request falls outside office hours.",
    },
    {
      target: '[data-tour="step-actions"]',
      placement: "top",
      title: "Continue",
      body: "Press Confirm to save your choice and go on to step 2.",
    },
  ),

  bookingDetails: page(
    "booking-details",
    {
      title: "Step 2: booking details",
      body: "Tell us who the booking is for and what it's for.",
    },
    {
      target: 'ol[aria-label="Booking progress"]',
      placement: "bottom",
      title: "Your progress",
      body: "You're on step 2 of 3.",
    },
    {
      target: '[data-tour="details-fields"]',
      placement: "bottom",
      title: "Your details",
      body: "Fill in your contact number, program or course, the nature of your activity and a short description. Fields marked required must be completed before you can continue.",
    },
    {
      target: '[data-tour="step-actions"]',
      placement: "top",
      title: "Confirm or go back",
      body: "Confirm moves on to the final review. Back returns to step 1, and what you've typed here is kept.",
    },
  ),

  bookingReview: page(
    "booking-review",
    {
      title: "Step 3: review and submit",
      body: "Last check. Nothing is sent to the admins until you confirm.",
    },
    {
      target: 'ol[aria-label="Booking progress"]',
      placement: "bottom",
      title: "Your progress",
      body: "You're on the last step.",
    },
    {
      target: "main section",
      placement: "top",
      title: "Your request",
      body: "Everything you entered, in one place. If something is wrong, use Back to fix it.",
    },
    {
      target: '[data-tour="step-actions"]',
      placement: "top",
      title: "Submit",
      body: "Confirm sends your request for review. You can follow its progress in Booking Status.",
    },
  ),

  status: page(
    "booking-status",
    {
      title: "Booking Status",
      body: "Every request you've made, and where each one stands.",
    },
    {
      target: '[data-tour="filters"]',
      placement: "bottom",
      title: "Find a request",
      body: "Search, filter by status or change the order.",
    },
    {
      target: '[data-tour="table"]',
      placement: "top",
      title: "Your requests",
      body: "Each row is one request. Open one to see all of its details. A request that hasn't been reviewed yet can still be edited, and one that isn't finished can be cancelled.",
    },
  ),

  archives: page(
    "booking-archives",
    {
      title: "Booking Archives",
      body: "Past requests that were approved, rejected or cancelled.",
    },
    {
      target: '[data-tour="filters"]',
      placement: "bottom",
      title: "Find a request",
      body: "Search, filter by outcome or change the order.",
    },
    {
      target: '[data-tour="table"]',
      placement: "top",
      title: "Archived requests",
      body: "Open a request from its row. Tick several rows to view, print or download their details together.",
    },
  ),
};

/** The tour for the page the person is on. Pages without their own tour get the basics. */
export function tourFor(pathname: string, params: Params): Tour {
  const tab = params.get("tab");

  if (pathname === "/admin-dashboard") {
    if (tab === "schedule") return TOURS.schedule;
    if (tab === "review") return params.get("request") ? TOURS.reviewDetail : TOURS.review;
    if (tab === "accounts") return TOURS.accounts;
    return params.get("view") === "b" ? TOURS.timelineWeek : TOURS.timelineMonth;
  }
  if (pathname === "/booking") return tab === "manage-rooms" ? TOURS.manageRooms : TOURS.rooms;
  if (pathname === "/booking/select-date" || pathname === "/booking/select-time") return TOURS.bookingDate;
  if (pathname === "/booking/booking-details") return TOURS.bookingDetails;
  if (pathname === "/booking/review-and-submit") return TOURS.bookingReview;
  if (pathname === "/booking-status") return TOURS.status;
  if (pathname === "/booking-archives") return TOURS.archives;
  return BASICS_TOUR;
}
