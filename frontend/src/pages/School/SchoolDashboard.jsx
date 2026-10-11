import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Button,
  Space,
  Tag,
  Table,
  Badge,
  Progress,
  Divider,
} from 'antd';
import {
  UsergroupAddOutlined,
  BookOutlined,
  CheckCircleOutlined,
  DollarCircleOutlined,
  CalendarOutlined,
  NotificationOutlined,
  RocketOutlined,
  PlusOutlined,
  FileDoneOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { schoolService } from '@/services/schoolService';
import storePersist from '@/redux/storePersist';

const { Title, Text, Paragraph } = Typography;

export default function SchoolDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeRoleView, setActiveRoleView] = useState('admin');

  const auth = storePersist.get('auth');
  const user = auth?.current;

  useEffect(() => {
    // If user's stored role is student or parent or teacher, set default view
    if (user?.role === 'student') setActiveRoleView('student');
    else if (user?.role === 'parent') setActiveRoleView('parent');
    else if (user?.role === 'teacher') setActiveRoleView('teacher');
    else if (user?.role === 'accountant') setActiveRoleView('accountant');
    else setActiveRoleView('admin');

    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await schoolService.getStats();
        if (res.success) setStats(res.result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Role Switcher Toolbar */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          marginBottom: 20,
          background: '#ffffff',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🏫</span>
              <div>
                <Text strong style={{ fontSize: 16, display: 'block', color: '#1e293b' }}>
                  School Management Role View
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Active Persona: <Tag color="blue">{user?.role?.toUpperCase() || 'OWNER'}</Tag> ({user?.name} {user?.surname})
                </Text>
              </div>
            </div>
          </Col>

          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Text strong style={{ fontSize: 13, marginRight: 4 }}>Role Portal View:</Text>
              <Button
                type={activeRoleView === 'admin' ? 'primary' : 'default'}
                onClick={() => setActiveRoleView('admin')}
                size="small"
              >
                👑 Principal / Admin
              </Button>
              <Button
                type={activeRoleView === 'teacher' ? 'primary' : 'default'}
                onClick={() => setActiveRoleView('teacher')}
                size="small"
              >
                👨‍🏫 Teacher
              </Button>
              <Button
                type={activeRoleView === 'accountant' ? 'primary' : 'default'}
                onClick={() => setActiveRoleView('accountant')}
                size="small"
              >
                💰 Accountant
              </Button>
              <Button
                type={activeRoleView === 'student' ? 'primary' : 'default'}
                onClick={() => setActiveRoleView('student')}
                size="small"
              >
                🎓 Student
              </Button>
              <Button
                type={activeRoleView === 'parent' ? 'primary' : 'default'}
                onClick={() => setActiveRoleView('parent')}
                size="small"
              >
                👨‍👩‍👧 Parent
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ADMIN & PRINCIPAL VIEW */}
      {activeRoleView === 'admin' && (
        <>
          {/* Welcome Banner */}
          <Card
            bordered={false}
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
              color: '#ffffff',
              marginBottom: 24,
              boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
            }}
          >
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} md={16}>
                <Tag color="cyan" style={{ marginBottom: 12, padding: '2px 8px', borderRadius: 4 }}>
                  Academic Year 2026-2027 • Active Term
                </Tag>
                <Title level={2} style={{ color: '#ffffff', margin: '0 0 10px' }}>
                  Welcome to Campus Academy Command Center
                </Title>
                <Paragraph style={{ color: '#cbd5e1', fontSize: 14, margin: '0 0 20px', maxWidth: 640 }}>
                  Oversee school admissions, classes, faculty assignments, attendance registers, examination grades, and institutional revenue.
                </Paragraph>
                <Space wrap>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/school/students')}>
                    Student Admission
                  </Button>
                  <Button ghost icon={<ScheduleOutlined />} onClick={() => navigate('/school/attendance')}>
                    Roll Call Register
                  </Button>
                  <Button ghost icon={<FileDoneOutlined />} onClick={() => navigate('/school/exams')}>
                    Marks & Grades
                  </Button>
                  <Button ghost icon={<NotificationOutlined />} onClick={() => navigate('/school/notices')}>
                    Publish Notice
                  </Button>
                </Space>
              </Col>

              <Col xs={24} md={8}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    padding: 20,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <Text style={{ color: '#93c5fd', fontSize: 13 }}>TODAY'S CAMPUS ATTENDANCE</Text>
                  <Title level={2} style={{ color: '#ffffff', margin: '6px 0' }}>
                    {stats?.attendanceToday?.rate ?? 96}%
                  </Title>
                  <Progress percent={stats?.attendanceToday?.rate ?? 96} strokeColor="#38bdf8" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12 }}>
                    <span style={{ color: '#86efac' }}>Present: {stats?.attendanceToday?.present ?? 2}</span>
                    <span style={{ color: '#fca5a5' }}>Absent: {stats?.attendanceToday?.absent ?? 0}</span>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Quick Stats Grid */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Statistic
                  title="Enrolled Students"
                  value={stats?.totalStudents || 3}
                  prefix={<UsergroupAddOutlined />}
                  valueStyle={{ color: '#2563eb' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Statistic
                  title="Teachers & Faculty"
                  value={stats?.totalTeachers || 2}
                  prefix="👨‍🏫"
                  valueStyle={{ color: '#7c3aed' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Statistic
                  title="Classes & Sections"
                  value={`${stats?.totalClasses || 2} Classes / ${stats?.totalSections || 2} Sec`}
                  prefix={<BookOutlined />}
                  valueStyle={{ color: '#0284c7' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Statistic
                  title="Fees Settled"
                  value={stats?.totalCollected || 3200}
                  prefix="$"
                  valueStyle={{ color: '#16a34a' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Notices & Upcoming Exams Row */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={14}>
              <Card
                title="📢 Recent Campus Bulletins"
                extra={<Button type="link" onClick={() => navigate('/school/notices')}>View All</Button>}
                bordered={false}
                style={{ borderRadius: 12 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {stats?.recentNotices?.map((n) => (
                    <div
                      key={n._id}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: '#f8fafc',
                        borderLeft: n.isPinned ? '4px solid #2563eb' : '4px solid #94a3b8',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 14 }}>{n.title}</Text>
                        <Tag color="blue">{n.category}</Tag>
                      </div>
                      <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
                        {n.content}
                      </Paragraph>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>

            <Col xs={24} md={10}>
              <Card
                title="🗓️ Upcoming Examinations"
                extra={<Button type="link" onClick={() => navigate('/school/exams')}>Exam Hub</Button>}
                bordered={false}
                style={{ borderRadius: 12 }}
              >
                {stats?.upcomingExams?.map((e) => (
                  <div
                    key={e._id}
                    style={{
                      padding: 14,
                      borderRadius: 8,
                      background: '#eff6ff',
                      marginBottom: 12,
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    <Title level={5} style={{ margin: '0 0 4px', color: '#1e3a8a' }}>{e.name}</Title>
                    <div style={{ fontSize: 13, color: '#475569' }}>
                      <CalendarOutlined /> Dates: {dayjs(e.startDate).format('MMM D')} - {dayjs(e.endDate).format('MMM D, YYYY')}
                    </div>
                    <Tag color="green" style={{ marginTop: 8 }}>Published Assessment</Tag>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* TEACHER VIEW SHORTCUTS */}
      {activeRoleView === 'teacher' && (
        <Card bordered={false} style={{ borderRadius: 12 }}>
          <Title level={3}>👨‍🏫 Teacher Daily Academic Console</Title>
          <Paragraph style={{ color: '#64748b' }}>
            Quickly perform roll calls for your assigned classes, input examination marks, and check daily period schedules.
          </Paragraph>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card
                hoverable
                onClick={() => navigate('/school/attendance')}
                style={{ borderRadius: 12, textAlign: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0' }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                <Title level={4}>Mark Attendance</Title>
                <Text type="secondary">1-click roll call marking for Grade 10 & 9</Text>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                hoverable
                onClick={() => navigate('/school/exams')}
                style={{ borderRadius: 12, textAlign: 'center', background: '#eff6ff', border: '1px solid #bfdbfe' }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
                <Title level={4}>Enter Subject Marks</Title>
                <Text type="secondary">Spreadsheet-like grading & feedback</Text>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                hoverable
                onClick={() => navigate('/school/timetable')}
                style={{ borderRadius: 12, textAlign: 'center', background: '#faf5ff', border: '1px solid #e9d5ff' }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>🗓️</div>
                <Title level={4}>Class Timetable</Title>
                <Text type="secondary">Weekly periods and classroom rooms</Text>
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* ACCOUNTANT VIEW SHORTCUTS */}
      {activeRoleView === 'accountant' && (
        <Card bordered={false} style={{ borderRadius: 12 }}>
          <Title level={3}>💰 Accountant Financial Portal</Title>
          <Paragraph style={{ color: '#64748b' }}>
            Collect student fees, issue official printed vouchers (RCP-2026-XXXX), and monitor outstanding tuition balances.
          </Paragraph>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card
                hoverable
                onClick={() => navigate('/school/fees')}
                style={{ borderRadius: 12, textAlign: 'center', background: '#ecfdf5', border: '1px solid #a7f3d0' }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>💵</div>
                <Title level={4}>Collect Fees & Issue Receipt</Title>
                <Text type="secondary">Generate official payment vouchers</Text>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                hoverable
                onClick={() => navigate('/school/fees')}
                style={{ borderRadius: 12, textAlign: 'center', background: '#fffbeb', border: '1px solid #fde68a' }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
                <Title level={4}>Defaulter Ledger</Title>
                <Text type="secondary">Track overdue student accounts</Text>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                hoverable
                onClick={() => navigate('/school/reports')}
                style={{ borderRadius: 12, textAlign: 'center', background: '#f8fafc', border: '1px solid #cbd5e1' }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
                <Title level={4}>Revenue Analytics</Title>
                <Text type="secondary">Comprehensive financial settlements</Text>
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* STUDENT VIEW SHORTCUTS */}
      {activeRoleView === 'student' && (
        <Card bordered={false} style={{ borderRadius: 12 }}>
          <Title level={3}>🎓 Student Academic Portal</Title>
          <Paragraph style={{ color: '#64748b' }}>
            Check your personal student profile, roll number, attendance score, examination transcript, and school notices.
          </Paragraph>
          <Button type="primary" size="large" onClick={() => navigate('/school/student-portal')}>
            Open Full Student Portal
          </Button>
        </Card>
      )}

      {/* PARENT VIEW SHORTCUTS */}
      {activeRoleView === 'parent' && (
        <Card bordered={false} style={{ borderRadius: 12 }}>
          <Title level={3}>👨‍👩‍👧 Parent & Guardian Portal</Title>
          <Paragraph style={{ color: '#64748b' }}>
            View academic records, attendance history, fees paid, and school bulletins for your linked child.
          </Paragraph>
          <Button type="primary" size="large" onClick={() => navigate('/school/parent-portal')}>
            Open Full Parent Portal
          </Button>
        </Card>
      )}
    </div>
  );
}
