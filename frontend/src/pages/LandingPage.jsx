import React from 'react';
import { Card, Row, Col, Typography, Button, Space, Tag, Divider, Collapse } from 'antd';
import {
  RocketOutlined,
  CheckCircleOutlined,
  UserOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
  CalendarOutlined,
  LoginOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <DollarCircleOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      title: 'Tuition & Fee Statements',
      description:
        'Track semester tuition, lab fees, hostel dues, and payment receipts with clear status tags and downloadable PDF invoices.',
    },
    {
      icon: <FileTextOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      title: 'Project Grants & Proposals',
      description:
        'Draft budget proposals for capstone projects, research grants, or student freelance work, and convert them to invoices with one click.',
    },
    {
      icon: <TeamOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      title: 'Faculty & Client Directory',
      description:
        'Keep organized records of academic advisors, department heads, research sponsors, and freelance clients with direct contact details.',
    },
    {
      icon: <CalendarOutlined style={{ fontSize: 32, color: '#fa8c16' }} />,
      title: 'Academic Deadlines & Tasks',
      description:
        'Stay on top of crucial semester milestones, tuition due dates, and project submissions with an interactive student task tracker.',
    },
  ];

  const faqs = [
    {
      key: '1',
      label: 'How do I log in to my Student Account?',
      children: (
        <Text>
          Click the "Student Sign In" button above. You can use your campus email and password, or use
          the pre-configured demo student credentials (<code>student@school.edu</code> /{' '}
          <code>student123</code>) to test student features.
        </Text>
      ),
    },
    {
      key: '2',
      label: 'Can I download PDF receipts for tuition and fee payments?',
      children: (
        <Text>
          Yes! Every fee statement and payment record includes a "Download PDF" option that generates an
          official receipt suitable for university reimbursement, scholarships, or tax reporting.
        </Text>
      ),
    },
    {
      key: '3',
      label: 'What are Project Proposals and Quotes?',
      children: (
        <Text>
          Proposals allow students to plan budgets for research projects, hackathons, or freelance work. Once
          approved by your advisor or client, you can convert the proposal directly into an invoice with one
          click.
        </Text>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        {/* Navigation Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 48,
            padding: '16px 24px',
            background: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #1890ff, #096dd9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 22,
              }}
            >
              🎓
            </div>
            <div>
              <Text strong style={{ fontSize: 18, color: '#1e293b', display: 'block', lineHeight: 1.2 }}>
                CampusHQ
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Student Academic & Finance Portal
              </Text>
            </div>
          </div>
          <Space>
            <Button type="default" onClick={() => navigate('/')}>
              Student Dashboard
            </Button>
            <Button type="primary" icon={<LoginOutlined />} onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </Space>
        </div>

        {/* Hero Section */}
        <Card
          bordered={false}
          style={{
            borderRadius: 24,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
            color: '#ffffff',
            padding: '48px 32px',
            marginBottom: 48,
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
          }}
        >
          <Row gutter={[32, 32]} align="middle">
            <Col xs={24} md={15}>
              <Tag color="cyan" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 20, marginBottom: 16 }}>
                🚀 Built for College & University Students
              </Tag>
              <Title level={1} style={{ color: '#ffffff', fontSize: '2.5rem', marginBottom: 16, fontWeight: 700 }}>
                Master Your Academic Finances & Student Projects
              </Title>
              <Paragraph style={{ color: '#cbd5e1', fontSize: 16, lineHeight: 1.6, marginBottom: 28 }}>
                The all-in-one student workspace to track semester tuition fees, manage research grant
                proposals, organize faculty and client contacts, and keep academic milestones in focus.
              </Paragraph>
              <Space wrap size="middle">
                <Button
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  onClick={() => navigate('/')}
                  style={{
                    height: 48,
                    padding: '0 28px',
                    borderRadius: 10,
                    fontWeight: 600,
                    background: '#2563eb',
                  }}
                >
                  Open Student Hub
                </Button>
                <Button
                  ghost
                  size="large"
                  icon={<ArrowRightOutlined />}
                  onClick={() => navigate('/login')}
                  style={{ height: 48, padding: '0 24px', borderRadius: 10, color: '#ffffff', borderColor: '#cbd5e1' }}
                >
                  Student Sign In
                </Button>
              </Space>
            </Col>

            <Col xs={24} md={9}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 16,
                  padding: 24,
                  color: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <SafetyCertificateOutlined style={{ fontSize: 24, color: '#38bdf8' }} />
                  <Text strong style={{ color: '#ffffff', fontSize: 16 }}>
                    Quick Demo Student Access
                  </Text>
                </div>
                <Paragraph style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
                  You can explore the student portal using the demo student account:
                </Paragraph>
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '12px 16px',
                    borderRadius: 8,
                    fontFamily: 'monospace',
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <span style={{ color: '#94a3b8' }}>Email: </span>
                    <span style={{ color: '#38bdf8' }}>student@school.edu</span>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{ color: '#94a3b8' }}>Pass:  </span>
                    <span style={{ color: '#38bdf8' }}>student123</span>
                  </div>
                </div>
                <Button block type="primary" onClick={() => navigate('/login')}>
                  One-Click Login
                </Button>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Feature Grid */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <Title level={2} style={{ color: '#0f172a', marginBottom: 8 }}>
              Everything You Need for Academic Success
            </Title>
            <Paragraph style={{ color: '#64748b', fontSize: 16, maxWidth: 640, margin: '0 auto' }}>
              Designed specifically to simplify academic life, budgeting, and project documentation for
              university students.
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            {features.map((f, i) => (
              <Col xs={24} sm={12} key={i}>
                <Card
                  bordered={false}
                  hoverable
                  style={{
                    borderRadius: 16,
                    height: '100%',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ marginBottom: 16 }}>{f.icon}</div>
                  <Title level={4} style={{ color: '#0f172a', marginBottom: 8 }}>
                    {f.title}
                  </Title>
                  <Paragraph style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 0 }}>
                    {f.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* Student Workflow Section */}
        <Card
          bordered={false}
          style={{
            borderRadius: 20,
            background: '#ffffff',
            padding: '24px 16px',
            marginBottom: 48,
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          <Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
            How Students Use CampusHQ
          </Title>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontSize: 22,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  1
                </div>
                <Title level={4}>Manage Faculty & Sponsors</Title>
                <Paragraph style={{ color: '#64748b', fontSize: 14 }}>
                  Add your professors, course coordinators, capstone sponsors, or freelance project clients to
                  your unified directory.
                </Paragraph>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    fontSize: 22,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  2
                </div>
                <Title level={4}>Create Invoices & Grant Budgets</Title>
                <Paragraph style={{ color: '#64748b', fontSize: 14 }}>
                  Generate clean tuition statements or research proposals with itemized course, lab, and
                  project expenses.
                </Paragraph>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: '#faf5ff',
                    color: '#9333ea',
                    fontSize: 22,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  3
                </div>
                <Title level={4}>Record Payments & Export Receipts</Title>
                <Paragraph style={{ color: '#64748b', fontSize: 14 }}>
                  Log tuition payments, scholarship disbursements, and download official PDF receipts for your
                  records.
                </Paragraph>
              </div>
            </Col>
          </Row>
        </Card>

        {/* FAQs */}
        <div style={{ marginBottom: 48 }}>
          <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
            Frequently Asked Questions
          </Title>
          <Collapse items={faqs} defaultActiveKey={['1']} style={{ background: '#ffffff', borderRadius: 12 }} />
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 14 }}>
          <p>© 2026 CampusHQ Student Academic Portal. Designed for university students & learners.</p>
        </div>
      </div>
    </div>
  );
}
