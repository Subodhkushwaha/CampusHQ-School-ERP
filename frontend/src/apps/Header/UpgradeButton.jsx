import { Button } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export default function UpgradeButton() {
  const navigate = useNavigate();

  return (
    <Button
      type="default"
      style={{
        float: 'right',
        cursor: 'pointer',
        borderRadius: '8px',
        borderColor: '#1890ff',
        color: '#1890ff',
        fontWeight: 500,
      }}
      icon={<BookOutlined />}
      onClick={() => {
        navigate('/landing');
      }}
    >
      Student Guide & Tour
    </Button>
  );
}
