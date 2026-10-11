import React from 'react';
import { Card, Row, Col, Typography, Button, Collapse, Tag, Space, Divider } from 'antd';
import {
  BookOutlined,
  QuestionCircleOutlined,
  CustomerServiceOutlined,
  MailOutlined,
  DollarCircleOutlined,
  FileProtectOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export default function About() {
  const navigate = useNavigate();

  const faqs = [
    {
      key: '1',
      label: 'How do tuition and course fee invoices work in CampusHQ?',
      children: (
        <Text>
          Your course fees, lab assessments, and semester charges appear under the <b>Tuition & Invoices</b> section.
          Each invoice details the items, subtotal, any campus tax/deductions, and total amount. When you pay, a record
          is logged under <b>Payments & Receipts</b>, automatically updating the invoice status to "Paid".
        </Text>
      ),
    },
    {
      key: '2',
      label: 'How can I create research grant proposals or capstone budgets?',
      children: (
        <Text>
          Head to <b>Proposals & Grants</b> and click "Add New Quote/Proposal". Enter the estimated expenses for your
          project (supplies, software licenses, testing hardware). You can export it as an official PDF document for your
          academic advisor or funding sponsor. Once approved, you can convert it directly to an active invoice.
        </Text>
      ),
    },
    {
      key: '3',
      label: 'Where can I download receipts for financial aid or tax credits?',
      children: (
        <Text>
          Every paid tuition statement has a downloadable PDF button. Click the PDF icon next to any invoice or payment
          record to save the official PDF receipt with payment timestamps and transaction numbers.
        </Text>
      ),
    },
    {
      key: '4',
      label: 'Who should I contact if my payment records do not match?',
      children: (
        <Text>
          For discrepancies with tuition records or scholarship disbursements, reach out to the Campus Bursar’s Office
          or Department Student Services at <code>bursar@university.edu</code>.
        </Text>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '20px auto', padding: '0 16px' }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '32px 24px',
          marginBottom: 32,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Tag color="blue" style={{ borderRadius: 12, padding: '2px 10px', fontSize: 12, border: 'none' }}>
            Campus Support & Student Hub
          </Tag>
          <Tag color="cyan" style={{ borderRadius: 12, padding: '2px 10px', fontSize: 12, border: 'none' }}>
            Academic Year 2026
          </Tag>
        </div>
        <Title level={2} style={{ color: '#ffffff', margin: '4px 0 12px' }}>
          🎓 CampusHQ Student Academic & Finance Portal
        </Title>
        <Paragraph style={{ color: '#94a3b8', fontSize: 15, maxWidth: 700, margin: '0 0 20px' }}>
          Welcome to CampusHQ! Designed specifically to help college and university students navigate
          course fees, project proposals, sponsor communication, and academic milestones with transparency and ease.
        </Paragraph>
        <Space wrap>
          <Button type="primary" icon={<BookOutlined />} onClick={() => navigate('/landing')}>
            View Portal Tour & Overview
          </Button>
          <Button ghost onClick={() => navigate('/')}>
            Back to Student Dashboard
          </Button>
        </Space>
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={16}>
          <Card
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', height: '100%' }}
          >
            <Title level={4} style={{ marginBottom: 20 }}>
              <QuestionCircleOutlined style={{ marginRight: 8, color: '#2563eb' }} />
              Student Academic & Billing FAQ
            </Title>
            <Collapse items={faqs} defaultActiveKey={['1']} />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', height: '100%' }}
          >
            <Title level={4} style={{ marginBottom: 16 }}>
              <CustomerServiceOutlined style={{ marginRight: 8, color: '#16a34a' }} />
              Campus Office Contacts
            </Title>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10 }}>
                <Text strong style={{ display: 'block', color: '#0f172a' }}>
                  🏛️ Office of the Bursar / Cashier
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Tuition payments, billing inquiries, and refunds
                </Text>
                <div style={{ marginTop: 6, fontSize: 13, color: '#2563eb' }}>bursar@university.edu</div>
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10 }}>
                <Text strong style={{ display: 'block', color: '#0f172a' }}>
                  💼 Capstone & Research Grants
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Proposal approvals and project budgeting
                </Text>
                <div style={{ marginTop: 6, fontSize: 13, color: '#2563eb' }}>grants@university.edu</div>
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10 }}>
                <Text strong style={{ display: 'block', color: '#0f172a' }}>
                  💻 Student IT & Portal Support
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Account access and technical support
                </Text>
                <div style={{ marginTop: 6, fontSize: 13, color: '#2563eb' }}>support@campushq.edu</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
