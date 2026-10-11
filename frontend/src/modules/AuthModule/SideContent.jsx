import { Space, Layout, Divider, Typography } from 'antd';
import logo from '@/style/images/idurar-crm-erp.svg';
import useLanguage from '@/locale/useLanguage';
import { useSelector } from 'react-redux';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function SideContent() {
  return (
    <Content
      style={{
        padding: '120px 30px 30px',
        width: '100%',
        maxWidth: '450px',
        margin: '0 auto',
      }}
      className="sideContent"
    >
      <div style={{ width: '100%' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 28,
            background: 'rgba(37, 99, 235, 0.1)',
            padding: '8px 16px',
            borderRadius: 30,
          }}
        >
          <span style={{ fontSize: 24 }}>🎓</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#1d4ed8' }}>CampusHQ</span>
        </div>

        <Title level={2} style={{ fontSize: 28, color: '#0f172a', marginBottom: 12 }}>
          Your Unified Academic & Financial Hub
        </Title>
        <Text style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, display: 'block' }}>
          Effortlessly manage your semester tuition dues, research grant proposals, professor contacts, and
          upcoming academic deadlines in one student-friendly interface.
        </Text>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155', fontSize: 14 }}>
            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
            <span>Live Tuition & Fee Statements with PDF Receipts</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155', fontSize: 14 }}>
            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
            <span>Capstone Project & Research Grant Proposals</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155', fontSize: 14 }}>
            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
            <span>Faculty Advisor & Project Sponsor Directory</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155', fontSize: 14 }}>
            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
            <span>Interactive Semester Milestone & Task Tracker</span>
          </div>
        </div>

        <div className="space20"></div>
      </div>
    </Content>
  );
}
