import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Layout, Menu } from 'antd';

import { useAppContext } from '@/context/appContext';

import useLanguage from '@/locale/useLanguage';
import logoIcon from '@/style/images/logo-icon.svg';
import logoText from '@/style/images/logo-text.svg';

import useResponsive from '@/hooks/useResponsive';

import {
  SettingOutlined,
  CustomerServiceOutlined,
  ContainerOutlined,
  FileSyncOutlined,
  DashboardOutlined,
  TagOutlined,
  TagsOutlined,
  UserOutlined,
  CreditCardOutlined,
  MenuOutlined,
  FileOutlined,
  ShopOutlined,
  FilterOutlined,
  WalletOutlined,
  ReconciliationOutlined,
  BookOutlined,
  TeamOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  NotificationOutlined,
  ScheduleOutlined,
  BarChartOutlined,
  IdcardOutlined,
  HeartOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

export default function Navigation() {
  const { isMobile } = useResponsive();

  return isMobile ? <MobileSidebar /> : <Sidebar collapsible={false} />;
}

function Sidebar({ collapsible, isMobile = false }) {
  let location = useLocation();

  const { state: stateApp, appContextAction } = useAppContext();
  const { isNavMenuClose } = stateApp;
  const { navMenu } = appContextAction;
  const [showLogoApp, setLogoApp] = useState(isNavMenuClose);
  const [currentPath, setCurrentPath] = useState(location.pathname.slice(1));

  const translate = useLanguage();
  const navigate = useNavigate();

  const items = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to={'/'}>School Hub Dashboard</Link>,
    },
    {
      key: 'students',
      icon: <UserOutlined />,
      label: <Link to={'/school/students'}>Student Admissions</Link>,
    },
    {
      key: 'teachers',
      icon: <TeamOutlined />,
      label: <Link to={'/school/teachers'}>Faculty & Teachers</Link>,
    },
    {
      key: 'classes',
      icon: <AppstoreOutlined />,
      label: <Link to={'/school/classes'}>Classes & Sections</Link>,
    },
    {
      key: 'attendance',
      icon: <CheckCircleOutlined />,
      label: <Link to={'/school/attendance'}>Daily Attendance</Link>,
    },
    {
      key: 'exams',
      icon: <FileDoneOutlined />,
      label: <Link to={'/school/exams'}>Examinations & Marks</Link>,
    },
    {
      key: 'fees',
      icon: <CreditCardOutlined />,
      label: <Link to={'/school/fees'}>Fees & Accounts</Link>,
    },
    {
      key: 'notices',
      icon: <NotificationOutlined />,
      label: <Link to={'/school/notices'}>Notice Board</Link>,
    },
    {
      key: 'timetable',
      icon: <ScheduleOutlined />,
      label: <Link to={'/school/timetable'}>Class Timetable</Link>,
    },
    {
      key: 'reports',
      icon: <BarChartOutlined />,
      label: <Link to={'/school/reports'}>Reports & Analytics</Link>,
    },
    {
      key: 'studentPortal',
      icon: <IdcardOutlined />,
      label: <Link to={'/school/student-portal'}>Student Portal</Link>,
    },
    {
      key: 'parentPortal',
      icon: <HeartOutlined />,
      label: <Link to={'/school/parent-portal'}>Parent Portal</Link>,
    },
    {
      key: 'import',
      icon: <ReconciliationOutlined />,
      label: <Link to={'/school/import'}>Bulk Import & Reconcile</Link>,
    },
    {
      type: 'divider',
    },
    {
      key: 'invoice',
      icon: <ContainerOutlined />,
      label: <Link to={'/invoice'}>Tuition Invoices</Link>,
    },
    {
      key: 'payment',
      icon: <WalletOutlined />,
      label: <Link to={'/payment'}>Settlement Receipts</Link>,
    },
    {
      key: 'customer',
      icon: <CustomerServiceOutlined />,
      label: <Link to={'/customer'}>Campus Contacts</Link>,
    },
    {
      key: 'landing',
      icon: <BookOutlined />,
      label: <Link to={'/landing'}>Campus Portal Tour</Link>,
    },
    {
      key: 'about',
      icon: <ReconciliationOutlined />,
      label: <Link to={'/about'}>Help & Support</Link>,
    },
  ];

  useEffect(() => {
    if (location)
      if (currentPath !== location.pathname) {
        if (location.pathname === '/') {
          setCurrentPath('dashboard');
        } else setCurrentPath(location.pathname.slice(1));
      }
  }, [location, currentPath]);

  useEffect(() => {
    if (isNavMenuClose) {
      setLogoApp(isNavMenuClose);
    }
    const timer = setTimeout(() => {
      if (!isNavMenuClose) {
        setLogoApp(isNavMenuClose);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isNavMenuClose]);
  const onCollapse = () => {
    navMenu.collapse();
  };

  return (
    <Sider
      collapsible={collapsible}
      collapsed={collapsible ? isNavMenuClose : collapsible}
      onCollapse={onCollapse}
      className="navigation"
      width={256}
      style={{
        overflow: 'auto',
        height: '100vh',

        position: isMobile ? 'absolute' : 'relative',
        bottom: '20px',
        ...(!isMobile && {
          // border: 'none',
          ['left']: '20px',
          top: '20px',
          // borderRadius: '8px',
        }),
      }}
      theme={'light'}
    >
      <div
        className="logo"
        onClick={() => navigate('/')}
        style={{
          cursor: 'pointer',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #1890ff, #096dd9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 20,
            boxShadow: '0 4px 10px rgba(24, 144, 255, 0.25)',
          }}
        >
          🎓
        </div>
        {!showLogoApp && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', lineHeight: 1.2 }}>
              CampusHQ
            </div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
              School ERP & Portal
            </div>
          </div>
        )}
      </div>
      <Menu
        items={items}
        mode="inline"
        theme={'light'}
        selectedKeys={[currentPath]}
        style={{
          width: 256,
        }}
      />
    </Sider>
  );
}

function MobileSidebar() {
  const [visible, setVisible] = useState(false);
  const showDrawer = () => {
    setVisible(true);
  };
  const onClose = () => {
    setVisible(false);
  };

  return (
    <>
      <Button
        type="text"
        size="large"
        onClick={showDrawer}
        className="mobile-sidebar-btn"
        style={{ ['marginLeft']: 25 }}
      >
        <MenuOutlined style={{ fontSize: 18 }} />
      </Button>
      <Drawer
        width={250}
        // style={{ backgroundColor: 'rgba(255, 255, 255, 1)' }}
        placement={'left'}
        closable={false}
        onClose={onClose}
        open={visible}
      >
        <Sidebar collapsible={false} isMobile={true} />
      </Drawer>
    </>
  );
}
