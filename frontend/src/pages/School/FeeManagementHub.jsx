import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Typography,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tabs,
  message,
  Statistic,
  Divider,
  Popconfirm,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  PrinterOutlined,
  DollarCircleOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  FileTextOutlined,
  ReloadOutlined,
  RollbackOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { schoolService } from '@/services/schoolService';

const { Title, Text } = Typography;

export default function FeeManagementHub() {
  const [feeStructures, setFeeStructures] = useState([]);
  const [payments, setPayments] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Refund Modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundingPayment, setRefundingPayment] = useState(null);
  const [refundReason, setRefundReason] = useState('');

  // Collection Report state
  const [reportDateRange, setReportDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [reportClass, setReportClass] = useState(null);
  const [collectionReportData, setCollectionReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [isStudentSpecific, setIsStudentSpecific] = useState(false);

  const [structureForm] = Form.useForm();
  const [paymentForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [structRes, payRes, defRes, stuRes, classRes] = await Promise.all([
        schoolService.list('feestructure'),
        schoolService.list('feepayment'),
        schoolService.getDefaulters(),
        schoolService.list('student'),
        schoolService.list('schoolclass'),
      ]);

      if (structRes.success) setFeeStructures(structRes.result || []);
      if (payRes.success) setPayments(payRes.result || []);
      if (defRes.success) setDefaulters(defRes.result || []);
      if (stuRes.success) setStudents(stuRes.result || []);
      if (classRes.success) setClasses(classRes.result || []);
    } catch (err) {
      message.error('Failed to load fee management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateStructure = async (values) => {
    try {
      const payload = {
        ...values,
        dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
      };
      await schoolService.create('feestructure', payload);
      message.success('Fee structure created successfully');
      setIsStructureModalOpen(false);
      structureForm.resetFields();
      setIsStudentSpecific(false);
      fetchData();
    } catch (err) {
      message.error('Failed to save fee structure');
    }
  };

  const handleRecordPayment = async (values) => {
    try {
      const res = await schoolService.recordFeePayment(values);
      if (res.success) {
        message.success('Fee payment recorded & receipt generated!');
        setIsPaymentModalOpen(false);
        paymentForm.resetFields();
        fetchData();
        // Show receipt modal
        setSelectedReceipt(res.result);
        setReceiptModalOpen(true);
      }
    } catch (err) {
      message.error('Failed to record payment');
    }
  };

  const handleRefund = async () => {
    if (!refundingPayment) return;
    try {
      const res = await schoolService.refundFeePayment(refundingPayment._id, refundReason);
      if (res.success) {
        message.success('Payment successfully refunded.');
        setRefundModalOpen(false);
        setRefundingPayment(null);
        setRefundReason('');
        fetchData();
      }
    } catch (err) {
      message.error('Failed to process refund');
    }
  };

  const fetchCollectionReport = async () => {
    setReportLoading(true);
    try {
      const params = {};
      if (reportDateRange?.[0]) params.startDate = reportDateRange[0].toISOString();
      if (reportDateRange?.[1]) params.endDate = reportDateRange[1].toISOString();
      if (reportClass) params.schoolClass = reportClass;

      const res = await schoolService.getCollectionReport(params);
      if (res.success) {
        setCollectionReportData(res.result);
      }
    } catch (err) {
      message.error('Failed to load collection report');
    } finally {
      setReportLoading(false);
    }
  };

  const totalCollected = payments
    .filter((p) => p.status === 'Paid' || p.status === 'Partial')
    .reduce((acc, p) => acc + (p.amountPaid || 0), 0);

  const totalPending = defaulters.reduce((acc, d) => acc + (d.balance || 0), 0);

  const structureColumns = [
    {
      title: 'Fee Title',
      dataIndex: 'title',
      key: 'title',
      render: (t) => <Text strong>{t}</Text>,
    },
    {
      title: 'Scope',
      key: 'scope',
      render: (_, r) => {
        if (r.student) {
          return <Tag color="purple">Student: {r.student.name} {r.student.surname}</Tag>;
        }
        return <Tag color="blue">{r.schoolClass?.name || 'All Classes'}</Tag>;
      },
    },
    {
      title: 'Fee Category',
      dataIndex: 'feeType',
      key: 'feeType',
      render: (ft) => <Tag color="cyan">{ft || 'Tuition'}</Tag>,
    },
    {
      title: 'Standard Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt) => <Text strong style={{ color: '#0369a1' }}>${amt?.toLocaleString()}</Text>,
    },
    {
      title: 'Concession / Discount',
      dataIndex: 'concessionAmount',
      key: 'concessionAmount',
      render: (c) => (c ? <Tag color="green">-${c}</Tag> : 'None'),
    },
    {
      title: 'Installments',
      key: 'installments',
      render: (_, r) => `${r.totalInstallments || 1} Part(s)`,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (d) => (d ? dayjs(d).format('YYYY-MM-DD') : 'Flexible'),
    },
  ];

  const paymentColumns = [
    {
      title: 'Receipt #',
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      render: (r) => <Tag color="cyan" style={{ fontWeight: 'bold' }}>{r}</Tag>,
    },
    {
      title: 'Student Name',
      dataIndex: 'student',
      key: 'student',
      render: (s) => (s ? `${s.name} ${s.surname}` : 'Student'),
    },
    {
      title: 'Fee Structure',
      dataIndex: 'feeStructure',
      key: 'feeStructure',
      render: (f) => f?.title || 'Tuition Fee',
    },
    {
      title: 'Amount Paid',
      dataIndex: 'amountPaid',
      key: 'amountPaid',
      render: (amt, r) => (
        <span style={{ color: r.status === 'Refunded' ? '#94a3b8' : '#16a34a', fontWeight: 'bold' }}>
          {r.status === 'Refunded' ? `-$${amt?.toLocaleString()} (Refunded)` : `+$${amt?.toLocaleString()}`}
        </span>
      ),
    },
    {
      title: 'Concession',
      dataIndex: 'concessionApplied',
      key: 'concessionApplied',
      render: (ca) => (ca ? <Tag color="green">-${ca}</Tag> : '-'),
    },
    {
      title: 'Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (m) => <Tag color="geekblue">{m || 'Portal'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st) => {
        let color = 'green';
        if (st === 'Partial') color = 'orange';
        if (st === 'Refunded') color = 'red';
        if (st === 'Failed') color = 'magenta';
        return <Tag color={color}>{st?.toUpperCase() || 'PAID'}</Tag>;
      },
    },
    {
      title: 'Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (d) => dayjs(d).format('YYYY-MM-DD'),
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => {
              setSelectedReceipt(record);
              setReceiptModalOpen(true);
            }}
          >
            Receipt
          </Button>

          {record.status !== 'Refunded' && (
            <Button
              size="small"
              danger
              icon={<RollbackOutlined />}
              onClick={() => {
                setRefundingPayment(record);
                setRefundReason('');
                setRefundModalOpen(true);
              }}
            >
              Refund
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const defaulterColumns = [
    {
      title: 'Student Name',
      dataIndex: 'student',
      key: 'student',
      render: (s) => (
        <div>
          <Text strong>{s?.name} {s?.surname}</Text>
          <div style={{ fontSize: 12, color: '#64748b' }}>Roll #{s?.rollNumber} ({s?.admissionNumber})</div>
        </div>
      ),
    },
    {
      title: 'Class',
      key: 'class',
      render: (_, r) => <Tag color="blue">{r.student?.schoolClass?.name || 'Class'}</Tag>,
    },
    {
      title: 'Total Fees Due',
      dataIndex: 'totalFees',
      key: 'totalFees',
      render: (amt) => `$${amt?.toLocaleString()}`,
    },
    {
      title: 'Amount Paid',
      dataIndex: 'totalPaid',
      key: 'totalPaid',
      render: (amt) => <Text style={{ color: '#16a34a' }}>${amt?.toLocaleString()}</Text>,
    },
    {
      title: 'Outstanding Balance',
      dataIndex: 'balance',
      key: 'balance',
      render: (bal) => <Tag color="red" style={{ fontSize: 13, fontWeight: 'bold' }}>${bal?.toLocaleString()}</Tag>,
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            💰 School Fee Management & Accounts
          </Title>
          <Text type="secondary">
            Manage tuition structures, collect installments, apply concessions, issue receipts, and track defaulter ledgers.
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Refresh
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => setIsStructureModalOpen(true)}>
              New Fee Structure
            </Button>
            <Button type="primary" icon={<DollarCircleOutlined />} onClick={() => setIsPaymentModalOpen(true)}>
              Record Fee Payment
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 10 }}>
            <Statistic
              title="Total Fees Collected"
              value={totalCollected}
              prefix="$"
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 10 }}>
            <Statistic
              title="Outstanding Balances"
              value={totalPending}
              prefix="$"
              valueStyle={{ color: '#dc2626' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 10 }}>
            <Statistic
              title="Active Fee Defaulters"
              value={defaulters.length}
              prefix="⚠️"
              valueStyle={{ color: '#d97706' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="payments"
        onChange={(key) => {
          if (key === 'reports') fetchCollectionReport();
        }}
        items={[
          {
            key: 'payments',
            label: `Payment Receipts (${payments.length})`,
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                  dataSource={payments}
                  columns={paymentColumns}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'structures',
            label: `Fee Structures (${feeStructures.length})`,
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                  dataSource={feeStructures}
                  columns={structureColumns}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'defaulters',
            label: `Defaulters & Balances (${defaulters.length})`,
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                  dataSource={defaulters}
                  columns={defaulterColumns}
                  rowKey={(r) => r.student?._id}
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'reports',
            label: 'Collection Reports & Analytics',
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <div style={{ marginBottom: 20 }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={10}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>Date Range:</Text>
                      <DatePicker.RangePicker
                        value={reportDateRange}
                        onChange={setReportDateRange}
                        style={{ width: '100%' }}
                      />
                    </Col>
                    <Col xs={24} md={8}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>Filter Class:</Text>
                      <Select
                        allowClear
                        placeholder="All Classes"
                        style={{ width: '100%' }}
                        value={reportClass}
                        onChange={setReportClass}
                      >
                        {classes.map((c) => (
                          <Select.Option key={c._id} value={c._id}>
                            {c.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Col>
                    <Col xs={24} md={6}>
                      <div style={{ height: 22 }} />
                      <Button type="primary" icon={<ReloadOutlined />} onClick={fetchCollectionReport} loading={reportLoading}>
                        Generate Report
                      </Button>
                    </Col>
                  </Row>
                </div>

                {collectionReportData && (
                  <div>
                    <Row gutter={16} style={{ marginBottom: 20 }}>
                      <Col xs={12} sm={6}>
                        <Card size="small" bordered style={{ borderRadius: 8 }}>
                          <Statistic
                            title="Revenue Collected"
                            value={collectionReportData.totalCollected}
                            prefix="$"
                            valueStyle={{ color: '#16a34a' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small" bordered style={{ borderRadius: 8 }}>
                          <Statistic
                            title="Concessions Applied"
                            value={collectionReportData.totalConcessions}
                            prefix="$"
                            valueStyle={{ color: '#2563eb' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small" bordered style={{ borderRadius: 8 }}>
                          <Statistic
                            title="Transactions"
                            value={collectionReportData.transactionCount}
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Table
                      dataSource={collectionReportData.payments || []}
                      rowKey="_id"
                      pagination={{ pageSize: 8 }}
                      columns={paymentColumns}
                    />
                  </div>
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* New Structure Modal */}
      <Modal
        title="Create Fee Structure"
        open={isStructureModalOpen}
        onCancel={() => setIsStructureModalOpen(false)}
        onOk={() => structureForm.submit()}
        width={600}
      >
        <Form form={structureForm} layout="vertical" onFinish={handleCreateStructure}>
          <Form.Item name="title" label="Fee Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Grade 10 Annual Tuition Fee" />
          </Form.Item>

          <Form.Item>
            <Checkbox
              checked={isStudentSpecific}
              onChange={(e) => setIsStudentSpecific(e.target.checked)}
            >
              Specific Student Structure (e.g. Special Concession / Hostel Fee)
            </Checkbox>
          </Form.Item>

          {isStudentSpecific ? (
            <Form.Item name="student" label="Select Student" rules={[{ required: true }]}>
              <Select placeholder="Search student">
                {students.map((s) => (
                  <Select.Option key={s._id} value={s._id}>
                    {s.name} {s.surname} (Roll #{s.rollNumber})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          ) : (
            <Form.Item name="schoolClass" label="Applicable Class">
              <Select placeholder="Select Class (Leave blank for all classes)" allowClear>
                {classes.map((c) => (
                  <Select.Option key={c._id} value={c._id}>
                    {c.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Standard Fee Amount ($)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} placeholder="3200" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="concessionAmount" label="Scholarship / Concession ($)" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="feeType" label="Category" initialValue="Tuition">
                <Select>
                  <Select.Option value="Tuition">Tuition</Select.Option>
                  <Select.Option value="Admission">Admission</Select.Option>
                  <Select.Option value="Exam">Exam</Select.Option>
                  <Select.Option value="Transport">Transport</Select.Option>
                  <Select.Option value="Activity">Activity & Lab</Select.Option>
                  <Select.Option value="Other">Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="totalInstallments" label="Total Installments" initialValue={1}>
                <InputNumber min={1} max={12} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dueDate" label="Due Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional fee details" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        title="Record Fee Payment & Issue Receipt"
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        onOk={() => paymentForm.submit()}
        width={620}
      >
        <Form form={paymentForm} layout="vertical" onFinish={handleRecordPayment}>
          <Form.Item name="student" label="Select Student" rules={[{ required: true }]}>
            <Select placeholder="Search student">
              {students.map((s) => (
                <Select.Option key={s._id} value={s._id}>
                  {s.name} {s.surname} (Roll #{s.rollNumber} - {s.schoolClass?.name || 'Class'})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="feeStructure" label="Fee Category / Structure" rules={[{ required: true }]}>
            <Select placeholder="Select Fee Structure">
              {feeStructures.map((f) => (
                <Select.Option key={f._id} value={f._id}>
                  {f.title} (${f.amount})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amountPaid" label="Amount Paid ($)" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="3200" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="concessionApplied" label="Concession Applied ($)" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="paymentMethod" label="Payment Method" initialValue="Online Portal">
                <Select>
                  <Select.Option value="Online Portal">Online Portal</Select.Option>
                  <Select.Option value="Cash">Cash</Select.Option>
                  <Select.Option value="Credit Card">Credit Card</Select.Option>
                  <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
                  <Select.Option value="Cheque">Cheque</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Payment Status" initialValue="Paid">
                <Select>
                  <Select.Option value="Paid">Paid in Full</Select.Option>
                  <Select.Option value="Partial">Partial Installment</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="transactionReference" label="Transaction Reference #">
            <Input placeholder="e.g. TXN-8849201" />
          </Form.Item>
          <Form.Item name="remarks" label="Notes / Remarks">
            <Input.TextArea rows={2} placeholder="Optional payment notes" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Refund Modal */}
      <Modal
        title="Process Payment Refund"
        open={refundModalOpen}
        onCancel={() => setRefundModalOpen(false)}
        onOk={handleRefund}
      >
        <p>
          Are you sure you want to refund receipt <Text strong>{refundingPayment?.receiptNumber}</Text> for student{' '}
          <Text strong>{refundingPayment?.student?.name} {refundingPayment?.student?.surname}</Text>?
        </p>
        <div style={{ marginBottom: 12 }}>
          Amount to refund: <Text strong style={{ color: '#dc2626' }}>${refundingPayment?.amountPaid?.toLocaleString()}</Text>
        </div>
        <div>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>Reason for Refund:</Text>
          <Input.TextArea
            rows={3}
            placeholder="e.g. Duplicate transaction, approved fee reduction"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* Official Receipt Viewer Modal */}
      <Modal
        title="Official Fee Payment Receipt"
        open={receiptModalOpen}
        onCancel={() => setReceiptModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setReceiptModalOpen(false)}>
            Close
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print Receipt
          </Button>,
        ]}
        width={650}
      >
        {selectedReceipt && (
          <div
            style={{
              padding: 24,
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              background: '#f8fafc',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Title level={4} style={{ margin: 0, color: '#1e3a8a' }}>
                🏫 CAMPUS ACADEMY BURSAR RECEIPT
              </Title>
              <Text type="secondary">Official University & School Payment Voucher</Text>
            </div>

            <Divider />

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">Receipt Number:</Text>
                <div><Text strong style={{ fontSize: 16 }}>{selectedReceipt.receiptNumber}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Date of Payment:</Text>
                <div><Text strong>{dayjs(selectedReceipt.paymentDate).format('YYYY-MM-DD HH:mm')}</Text></div>
              </Col>

              <Col span={12}>
                <Text type="secondary">Student Name:</Text>
                <div><Text strong>{selectedReceipt.student?.name} {selectedReceipt.student?.surname}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Admission Number:</Text>
                <div><Text strong>{selectedReceipt.student?.admissionNumber || 'ADM-2026'}</Text></div>
              </Col>

              <Col span={12}>
                <Text type="secondary">Fee Structure:</Text>
                <div><Text strong>{selectedReceipt.feeStructure?.title || 'Tuition Fee'}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Payment Method:</Text>
                <div><Tag color="green">{selectedReceipt.paymentMethod || 'Online Portal'}</Tag></div>
              </Col>
            </Row>

            <Divider />

            <div style={{ background: '#e0f2fe', padding: 16, borderRadius: 8, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>TOTAL AMOUNT SETTLED</Text>
              <Title level={2} style={{ margin: 0, color: '#0369a1' }}>
                ${selectedReceipt.amountPaid?.toLocaleString()}
              </Title>
              <Tag color={selectedReceipt.status === 'Refunded' ? 'red' : 'green'} style={{ marginTop: 6 }}>
                STATUS: {selectedReceipt.status === 'Refunded' ? 'REFUNDED' : 'PAID IN FULL'}
              </Tag>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                This is a computer-generated voucher. Valid for academic records and financial aid documentation.
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
