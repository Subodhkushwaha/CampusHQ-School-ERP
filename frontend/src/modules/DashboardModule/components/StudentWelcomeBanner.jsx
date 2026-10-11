import React from 'react';
import { Card, Row, Col, Typography, Button, Space, Tag, Avatar } from 'antd';
import {
  RocketOutlined,
  PlusCircleOutlined,
  FileAddOutlined,
  UserAddOutlined,
  CreditCardOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

export default function StudentWelcomeBanner() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const navigate = useNavigate();

  const studentName = currentAdmin?.name || 'Student';

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 20,
        background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
        color: '#ffffff',
        marginBottom: 32,
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
        padding: '12px 8px',
      }}
    >
      <Row gutter={[24, 24]} align="middle">
        <Col xs={24} lg={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Tag
              color="blue"
              style={{
                borderRadius: 12,
                padding: '2px 10px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
              }}
            >
              🎓 Student Academic & Finance Hub
            </Tag>
            <Tag
              color="green"
              style={{
                borderRadius: 12,
                padding: '2px 10px',
                fontSize: 12,
                border: 'none',
              }}
            >
              Spring Semester 2026
            </Tag>
          </div>

          <Title level={2} style={{ color: '#ffffff', margin: '4px 0 8px', fontWeight: 700 }}>
            Welcome back, {studentName}!
          </Title>

          <Paragraph style={{ color: '#cbd5e1', fontSize: 14, margin: '0 0 16px', maxWidth: 650 }}>
            Here is your live campus overview. Monitor your tuition fee payments, track research grant
            proposals, organize faculty contacts, and stay ahead of academic milestones.
          </Paragraph>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: 8 }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block' }}>Program / Major</Text>
              <Text strong style={{ color: '#ffffff', fontSize: 13 }}>
                Computer Science & Engineering
              </Text>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: 8 }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block' }}>Student ID</Text>
              <Text strong style={{ color: '#ffffff', fontSize: 13 }}>
                STU-2026-8812
              </Text>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: 8 }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block' }}>Academic Status</Text>
              <Text strong style={{ color: '#4ade80', fontSize: 13 }}>
                Good Standing (Year 3)
              </Text>
            </div>
          </div>
        </Col>

        <Col xs={24} lg={8}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.07)',
              borderRadius: 16,
              padding: 20,
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <Text strong style={{ color: '#ffffff', display: 'block', marginBottom: 12, fontSize: 14 }}>
              ⚡ Quick Actions
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button
                type="primary"
                icon={<CreditCardOutlined />}
                onClick={() => navigate('/payment')}
                style={{ textAlign: 'left', borderRadius: 8, background: '#2563eb' }}
              >
                Record Fee Payment
              </Button>
              <Button
                ghost
                icon={<FileAddOutlined />}
                onClick={() => navigate('/quote/create')}
                style={{ textAlign: 'left', borderRadius: 8, color: '#ffffff', borderColor: '#94a3b8' }}
              >
                Create Project Proposal / Grant
              </Button>
              <Button
                ghost
                icon={<UserAddOutlined />}
                onClick={() => navigate('/customer')}
                style={{ textAlign: 'left', borderRadius: 8, color: '#ffffff', borderColor: '#94a3b8' }}
              >
                Add Faculty / Client Contact
              </Button>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
}
