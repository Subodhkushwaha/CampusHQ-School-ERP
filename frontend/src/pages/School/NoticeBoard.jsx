import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Typography,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  DatePicker,
  message,
  Popconfirm,
  Badge,
  Tooltip,
} from 'antd';
import {
  NotificationOutlined,
  PlusOutlined,
  PushpinOutlined,
  CalendarOutlined,
  UserOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { schoolService } from '@/services/schoolService';

const { Title, Text, Paragraph } = Typography;

export default function NoticeBoard() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [targetFilter, setTargetFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [form] = Form.useForm();

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await schoolService.list('notice');
      if (res.success) {
        setNotices(res.result || []);
      }
    } catch (err) {
      message.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const openCreateModal = () => {
    setEditingNotice(null);
    form.resetFields();
    form.setFieldsValue({
      category: 'Academic',
      targetAudience: 'All',
      author: 'Principal Office',
      isPinned: false,
      isPublished: true,
      publishDate: dayjs(),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (notice) => {
    setEditingNotice(notice);
    form.setFieldsValue({
      title: notice.title,
      content: notice.content,
      category: notice.category || 'Academic',
      targetAudience: notice.targetAudience || 'All',
      author: notice.author || 'Administration',
      isPinned: !!notice.isPinned,
      isPublished: notice.isPublished !== false,
      publishDate: notice.publishDate ? dayjs(notice.publishDate) : dayjs(),
      expiryDate: notice.expiryDate ? dayjs(notice.expiryDate) : null,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        publishDate: values.publishDate ? values.publishDate.toISOString() : new Date().toISOString(),
        expiryDate: values.expiryDate ? values.expiryDate.toISOString() : null,
      };

      if (editingNotice) {
        await schoolService.update('notice', editingNotice._id, payload);
        message.success('Notice updated successfully!');
      } else {
        await schoolService.create('notice', payload);
        message.success('Notice published successfully!');
      }

      setIsModalOpen(false);
      form.resetFields();
      setEditingNotice(null);
      fetchNotices();
    } catch (err) {
      message.error(editingNotice ? 'Failed to update notice' : 'Failed to publish notice');
    }
  };

  const handleDelete = async (id) => {
    await schoolService.delete('notice', id);
    message.success('Notice removed');
    fetchNotices();
  };

  const filteredNotices = notices.filter((n) => {
    const matchTarget = targetFilter === 'ALL' || n.targetAudience === targetFilter;
    const matchCat = categoryFilter === 'ALL' || n.category === categoryFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || (n.title && n.title.toLowerCase().includes(q)) || (n.content && n.content.toLowerCase().includes(q));
    return matchTarget && matchCat && matchSearch;
  });

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Urgent':
        return 'red';
      case 'Examination':
        return 'purple';
      case 'Academic':
        return 'blue';
      case 'Event':
        return 'green';
      case 'Holiday':
        return 'orange';
      default:
        return 'geekblue';
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            📢 Campus Notice Board & Announcements
          </Title>
          <Text type="secondary">
            Publish academic bulletins, exam schedules, event announcements, and targeted notifications.
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchNotices} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Publish Announcement
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Filter Toolbar */}
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Filter by Audience:</Text>
            <Select style={{ width: '100%' }} value={targetFilter} onChange={setTargetFilter}>
              <Select.Option value="ALL">All Audiences</Select.Option>
              <Select.Option value="All">General (Whole School)</Select.Option>
              <Select.Option value="Students">Students Only</Select.Option>
              <Select.Option value="Teachers">Teachers / Faculty</Select.Option>
              <Select.Option value="Parents">Parents Only</Select.Option>
              <Select.Option value="Staff">Administrative Staff</Select.Option>
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Filter by Category:</Text>
            <Select style={{ width: '100%' }} value={categoryFilter} onChange={setCategoryFilter}>
              <Select.Option value="ALL">All Categories</Select.Option>
              <Select.Option value="Academic">Academic</Select.Option>
              <Select.Option value="Examination">Examination</Select.Option>
              <Select.Option value="Event">Event</Select.Option>
              <Select.Option value="Urgent">Urgent</Select.Option>
              <Select.Option value="Holiday">Holiday</Select.Option>
              <Select.Option value="Administrative">Administrative</Select.Option>
            </Select>
          </Col>

          <Col xs={24} sm={24} md={8}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Search Bulletins:</Text>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Search by keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      {/* Notice Cards Grid */}
      <Row gutter={[16, 16]}>
        {filteredNotices.length === 0 ? (
          <Col span={24}>
            <Card style={{ textAlign: 'center', padding: '40px 0', borderRadius: 12 }}>
              <Paragraph type="secondary" style={{ fontSize: 16 }}>
                No announcements found matching the selected filters.
              </Paragraph>
            </Card>
          </Col>
        ) : (
          filteredNotices.map((n) => {
            const isExpired = n.expiryDate && dayjs().isAfter(dayjs(n.expiryDate));
            return (
              <Col xs={24} md={12} key={n._id}>
                <Card
                  bordered={false}
                  style={{
                    borderRadius: 12,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                    borderLeft: n.isPinned ? '5px solid #2563eb' : '1px solid #f1f5f9',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: isExpired ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <Space wrap>
                      <Tag color={getCategoryColor(n.category)}>{n.category}</Tag>
                      <Tag color="cyan">Audience: {n.targetAudience}</Tag>
                      {n.isPinned && (
                        <Tag icon={<PushpinOutlined />} color="gold">
                          PINNED
                        </Tag>
                      )}
                      {isExpired && (
                        <Tag color="default">
                          EXPIRED
                        </Tag>
                      )}
                      {n.isPublished === false && (
                        <Tag color="warning">DRAFT</Tag>
                      )}
                    </Space>

                    <Space>
                      <Tooltip title="Edit Notice">
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined style={{ color: '#2563eb' }} />}
                          onClick={() => openEditModal(n)}
                        />
                      </Tooltip>
                      <Popconfirm title="Delete this notice?" onConfirm={() => handleDelete(n._id)}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  </div>

                  <Title level={4} style={{ margin: '0 0 10px', color: '#1e293b' }}>
                    {n.title}
                  </Title>

                  <Paragraph style={{ color: '#475569', fontSize: 14, flex: 1, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {n.content}
                  </Paragraph>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 12,
                      borderTop: '1px solid #f1f5f9',
                      fontSize: 12,
                      color: '#94a3b8',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <span>
                      <UserOutlined /> By {n.author || 'Admin Office'}
                    </span>
                    <Space size={12}>
                      <span>
                        <CalendarOutlined /> Published: {dayjs(n.publishDate).format('MMM D, YYYY')}
                      </span>
                      {n.expiryDate && (
                        <span style={{ color: isExpired ? '#ef4444' : '#64748b' }}>
                          <ClockCircleOutlined /> Expires: {dayjs(n.expiryDate).format('MMM D, YYYY')}
                        </span>
                      )}
                    </Space>
                  </div>
                </Card>
              </Col>
            );
          })
        )}
      </Row>

      {/* Publish / Edit Notice Modal */}
      <Modal
        title={editingNotice ? 'Edit School Announcement' : 'Publish School Announcement'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingNotice(null);
        }}
        onOk={() => form.submit()}
        width={650}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="Announcement Title" rules={[{ required: true, message: 'Please enter title' }]}>
            <Input placeholder="e.g. Mid-Term Examination Schedule Announced" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Category" initialValue="Academic">
                <Select>
                  <Select.Option value="Academic">Academic</Select.Option>
                  <Select.Option value="Examination">Examination</Select.Option>
                  <Select.Option value="Event">Event</Select.Option>
                  <Select.Option value="Urgent">Urgent</Select.Option>
                  <Select.Option value="Holiday">Holiday</Select.Option>
                  <Select.Option value="Administrative">Administrative</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetAudience" label="Target Audience" initialValue="All">
                <Select>
                  <Select.Option value="All">All School</Select.Option>
                  <Select.Option value="Students">Students</Select.Option>
                  <Select.Option value="Teachers">Teachers</Select.Option>
                  <Select.Option value="Parents">Parents</Select.Option>
                  <Select.Option value="Staff">Staff</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="publishDate" label="Publish Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expiryDate" label="Expiry Date (Optional)">
                <DatePicker style={{ width: '100%' }} placeholder="Select expiration date" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="content" label="Notice Description & Details" rules={[{ required: true, message: 'Please enter content' }]}>
            <Input.TextArea rows={4} placeholder="Full notice message text..." />
          </Form.Item>

          <Row gutter={16} align="middle">
            <Col span={12}>
              <Form.Item name="author" label="Author / Department" initialValue="Principal Office">
                <Input placeholder="Principal Office" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="isPinned" label="Pin to Top" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="isPublished" label="Active" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
