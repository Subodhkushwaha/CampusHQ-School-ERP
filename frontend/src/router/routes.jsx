import { lazy } from 'react';

import { Navigate } from 'react-router-dom';

const Logout = lazy(() => import('@/pages/Logout.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Customer = lazy(() => import('@/pages/Customer'));
const Invoice = lazy(() => import('@/pages/Invoice'));
const InvoiceCreate = lazy(() => import('@/pages/Invoice/InvoiceCreate'));

const InvoiceRead = lazy(() => import('@/pages/Invoice/InvoiceRead'));
const InvoiceUpdate = lazy(() => import('@/pages/Invoice/InvoiceUpdate'));
const InvoiceRecordPayment = lazy(() => import('@/pages/Invoice/InvoiceRecordPayment'));
const Quote = lazy(() => import('@/pages/Quote/index'));
const QuoteCreate = lazy(() => import('@/pages/Quote/QuoteCreate'));
const QuoteRead = lazy(() => import('@/pages/Quote/QuoteRead'));
const QuoteUpdate = lazy(() => import('@/pages/Quote/QuoteUpdate'));
const Payment = lazy(() => import('@/pages/Payment/index'));
const PaymentRead = lazy(() => import('@/pages/Payment/PaymentRead'));
const PaymentUpdate = lazy(() => import('@/pages/Payment/PaymentUpdate'));

const Settings = lazy(() => import('@/pages/Settings/Settings'));
const PaymentMode = lazy(() => import('@/pages/PaymentMode'));
const Taxes = lazy(() => import('@/pages/Taxes'));

const Profile = lazy(() => import('@/pages/Profile'));

const About = lazy(() => import('@/pages/About'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));

const SchoolDashboard = lazy(() => import('@/pages/School/SchoolDashboard'));
const ClassesSections = lazy(() => import('@/pages/School/ClassesSections'));
const Teachers = lazy(() => import('@/pages/School/Teachers'));
const Students = lazy(() => import('@/pages/School/Students'));
const AttendanceHub = lazy(() => import('@/pages/School/AttendanceHub'));
const ExaminationsHub = lazy(() => import('@/pages/School/ExaminationsHub'));
const FeeManagementHub = lazy(() => import('@/pages/School/FeeManagementHub'));
const NoticeBoard = lazy(() => import('@/pages/School/NoticeBoard'));
const TimetableHub = lazy(() => import('@/pages/School/TimetableHub'));
const SchoolReports = lazy(() => import('@/pages/School/SchoolReports'));
const StudentPortal = lazy(() => import('@/pages/School/StudentPortal'));
const ParentPortal = lazy(() => import('@/pages/School/ParentPortal'));
const BulkImportHub = lazy(() => import('@/pages/School/BulkImportHub'));

let routes = {
  expense: [],
  default: [
    {
      path: '/login',
      element: <Navigate to="/" />,
    },
    {
      path: '/logout',
      element: <Logout />,
    },
    {
      path: '/landing',
      element: <LandingPage />,
    },
    {
      path: '/about',
      element: <About />,
    },
    {
      path: '/',
      element: <SchoolDashboard />,
    },
    {
      path: '/school',
      element: <SchoolDashboard />,
    },
    {
      path: '/school/classes',
      element: <ClassesSections />,
    },
    {
      path: '/school/teachers',
      element: <Teachers />,
    },
    {
      path: '/school/students',
      element: <Students />,
    },
    {
      path: '/school/attendance',
      element: <AttendanceHub />,
    },
    {
      path: '/school/exams',
      element: <ExaminationsHub />,
    },
    {
      path: '/school/fees',
      element: <FeeManagementHub />,
    },
    {
      path: '/school/notices',
      element: <NoticeBoard />,
    },
    {
      path: '/school/timetable',
      element: <TimetableHub />,
    },
    {
      path: '/school/reports',
      element: <SchoolReports />,
    },
    {
      path: '/school/student-portal',
      element: <StudentPortal />,
    },
    {
      path: '/school/parent-portal',
      element: <ParentPortal />,
    },
    {
      path: '/school/import',
      element: <BulkImportHub />,
    },
    {
      path: '/dashboard',
      element: <Dashboard />,
    },
    {
      path: '/customer',
      element: <Customer />,
    },

    {
      path: '/invoice',
      element: <Invoice />,
    },
    {
      path: '/invoice/create',
      element: <InvoiceCreate />,
    },
    {
      path: '/invoice/read/:id',
      element: <InvoiceRead />,
    },
    {
      path: '/invoice/update/:id',
      element: <InvoiceUpdate />,
    },
    {
      path: '/invoice/pay/:id',
      element: <InvoiceRecordPayment />,
    },
    {
      path: '/quote',
      element: <Quote />,
    },
    {
      path: '/quote/create',
      element: <QuoteCreate />,
    },
    {
      path: '/quote/read/:id',
      element: <QuoteRead />,
    },
    {
      path: '/quote/update/:id',
      element: <QuoteUpdate />,
    },
    {
      path: '/payment',
      element: <Payment />,
    },
    {
      path: '/payment/read/:id',
      element: <PaymentRead />,
    },
    {
      path: '/payment/update/:id',
      element: <PaymentUpdate />,
    },

    {
      path: '/settings',
      element: <Settings />,
    },
    {
      path: '/settings/edit/:settingsKey',
      element: <Settings />,
    },
    {
      path: '/payment/mode',
      element: <PaymentMode />,
    },
    {
      path: '/taxes',
      element: <Taxes />,
    },

    {
      path: '/profile',
      element: <Profile />,
    },
    {
      path: '*',
      element: <NotFound />,
    },
  ],
};

export default routes;
