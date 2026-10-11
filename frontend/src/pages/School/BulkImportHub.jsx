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
  Select,
  Upload,
  Table,
  Steps,
  Alert,
  Tabs,
  Badge,
  Progress,
  Divider,
  Switch,
  Tooltip,
  Popconfirm,
  Statistic,
  Input,
  message,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  FileExcelOutlined,
  ReconciliationOutlined,
  HistoryOutlined,
  UsergroupAddOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  ReloadOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { schoolService } from '@/services/schoolService';

const { Title, Text, Paragraph } = Typography;

const IMPORT_TYPES = [
  {
    key: 'students',
    title: 'Students & Admissions',
    icon: '🎓',
    desc: 'Student profiles, admission numbers, demographics, parent linkages, and class allocations.',
  },
  {
    key: 'teachers',
    title: 'Faculty & Teachers',
    icon: '👨‍🏫',
    desc: 'Teacher employee profiles, qualifications, emails, and assigned subject/class allocations.',
  },
  {
    key: 'parents',
    title: 'Parents & Guardians',
    icon: '👨‍👩‍👧',
    desc: 'Parent directory and linking parent accounts to multiple student admission numbers.',
  },
  {
    key: 'classes_sections',
    title: 'Classes & Sections',
    icon: '🏫',
    desc: 'Create or update school classes, grades, sections, room numbers, and student capacities.',
  },
  {
    key: 'subjects',
    title: 'Curriculum Subjects',
    icon: '📚',
    desc: 'Subject names, codes, credits, theory/practical classification, and instructor links.',
  },
  {
    key: 'assignments',
    title: 'Teacher-Class Assignments',
    icon: '📋',
    desc: 'Allocate subject teachers, sections, room numbers, and designated class teachers.',
  },
  {
    key: 'enrollments',
    title: 'Academic Enrollments',
    icon: '📝',
    desc: 'Enroll students into classes and sections for specific academic years with roll numbers.',
  },
  {
    key: 'fee_structures',
    title: 'Fee Structures',
    icon: '💳',
    desc: 'Class tuition, fee components, approved concession amounts, and payment due dates.',
  },
];

export default function BulkImportHub() {
  const [activeTab, setActiveTab] = useState('wizard');
  const [currentStep, setCurrentStep] = useState(0);

  // Wizard state
  const [selectedType, setSelectedType] = useState('students');
  const [fileList, setFileList] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  // Column mapping: { [sheetHeader]: canonicalKey }
  const [columnMapping, setColumnMapping] = useState({});

  // Validation state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Reconciliation state
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationResult, setReconciliationResult] = useState(null);

  // Commit state
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState(null);
  const [provisionAccounts, setProvisionAccounts] = useState(true);

  // History state
  const [historyJobs, setHistoryJobs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // 1. Fetch History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await schoolService.getImportJobs();
      if (res.success) {
        setHistoryJobs(res.result || []);
      }
    } catch (err) {
      message.error('Failed to load import audit history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  // Handle template download
  const handleDownloadTemplate = async (format = 'xlsx') => {
    try {
      message.loading({ content: `Generating ${selectedType} template...`, key: 'tpl' });
      await schoolService.downloadImportTemplate(selectedType, format);
      message.success({ content: 'Template downloaded successfully!', key: 'tpl' });
    } catch (err) {
      message.error({ content: 'Failed to download template', key: 'tpl' });
    }
  };

  // Handle file upload & parse
  const handleUploadFile = async () => {
    if (fileList.length === 0) {
      message.warning('Please select an Excel or CSV file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0]);
    formData.append('type', selectedType);

    setParsing(true);
    try {
      const res = await schoolService.parseSpreadsheet(formData);
      if (res.success) {
        setParsedData(res.result);
        setColumnMapping(res.result.suggestedMapping || {});
        message.success(`Parsed ${res.result.totalRows} rows from ${res.result.fileName}`);
        setCurrentStep(2); // Go to Column Mapping step
      } else {
        message.error(res.message || 'Failed to parse spreadsheet');
      }
    } catch (err) {
      message.error('Parsing error occurred');
    } finally {
      setParsing(false);
    }
  };

  // Run validation
  const handleRunValidation = async () => {
    if (!parsedData) return;

    setValidating(true);
    try {
      const payload = {
        importType: selectedType,
        rows: parsedData.rows,
        columnMapping,
      };
      const res = await schoolService.validateImportBatch(payload);
      if (res.success) {
        setValidationResult(res.result);
        message.success('Validation completed!');
        setCurrentStep(3); // Go to Preview & Validation step
      } else {
        message.error(res.message || 'Validation failed');
      }
    } catch (err) {
      message.error('Error during validation');
    } finally {
      setValidating(false);
    }
  };

  // Run reconciliation
  const handleRunReconciliation = async () => {
    if (!parsedData) return;

    setReconciling(true);
    try {
      const payload = {
        importType: selectedType,
        rows: parsedData.rows,
        columnMapping,
      };
      const res = await schoolService.reconcileImportBatch(payload);
      if (res.success) {
        setReconciliationResult(res.result);
        message.success('Reconciliation completed!');
        setCurrentStep(4); // Go to Reconciliation step
      } else {
        message.error(res.message || 'Reconciliation failed');
      }
    } catch (err) {
      message.error('Error during reconciliation');
    } finally {
      setReconciling(false);
    }
  };

  // Execute commit
  const handleCommit = async () => {
    if (!parsedData) return;

    setCommitting(true);
    try {
      const payload = {
        importType: selectedType,
        rows: parsedData.rows,
        columnMapping,
        provisionAccounts,
        fileName: parsedData.fileName,
        fileSize: parsedData.fileSize,
      };
      const res = await schoolService.commitImportBatch(payload);
      if (res.success) {
        setCommitResult(res.result);
        message.success('Import executed successfully!');
        setCurrentStep(5); // Go to Results step
      } else {
        message.error(res.message || 'Commit failed');
      }
    } catch (err) {
      message.error('Commit failed');
    } finally {
      setCommitting(false);
    }
  };

  // Reset wizard
  const handleReset = () => {
    setCurrentStep(0);
    setFileList([]);
    setParsedData(null);
    setColumnMapping({});
    setValidationResult(null);
    setReconciliationResult(null);
    setCommitResult(null);
  };

  // Download error / audit report
  const handleExportReport = async (jobId, format = 'xlsx') => {
    try {
      message.loading({ content: 'Generating report...', key: 'rep' });
      await schoolService.exportImportJobReport(jobId, format);
      message.success({ content: 'Report downloaded!', key: 'rep' });
    } catch (err) {
      message.error({ content: 'Export failed', key: 'rep' });
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1300, margin: '0 auto' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ReconciliationOutlined style={{ color: '#2563eb' }} />
            Bulk Excel Import & Data Reconciliation
          </Title>
          <Text type="secondary">
            Upload institutional spreadsheets, validate records, reconcile class-teacher-student relationships, and provision authorized portals.
          </Text>
        </Col>
        <Col>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            items={[
              { key: 'wizard', label: 'Import Wizard' },
              { key: 'history', label: 'Import History & Audit Log' },
            ]}
          />
        </Col>
      </Row>

      {activeTab === 'wizard' ? (
        <div>
          {/* Steps Progress */}
          <Card bordered={false} style={{ borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <Steps
              current={currentStep}
              size="small"
              items={[
                { title: 'Select Type' },
                { title: 'Upload File' },
                { title: 'Column Mapping' },
                { title: 'Validation & Preview' },
                { title: 'Reconciliation' },
                { title: 'Execution Results' },
              ]}
            />
          </Card>

          {/* STEP 0: Select Import Type */}
          {currentStep === 0 && (
            <div>
              <Title level={4} style={{ marginBottom: 16 }}>
                1. Select School Dataset to Import:
              </Title>
              <Row gutter={[16, 16]}>
                {IMPORT_TYPES.map((t) => {
                  const isSelected = selectedType === t.key;
                  return (
                    <Col xs={24} sm={12} md={6} key={t.key}>
                      <Card
                        hoverable
                        onClick={() => setSelectedType(t.key)}
                        style={{
                          borderRadius: 12,
                          border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          height: '100%',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ fontSize: 32, marginBottom: 8 }}>{t.icon}</div>
                        <Title level={5} style={{ margin: '0 0 6px', color: isSelected ? '#1d4ed8' : '#1e293b' }}>
                          {t.title}
                        </Title>
                        <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
                          {t.desc}
                        </Paragraph>
                      </Card>
                    </Col>
                  );
                })}
              </Row>

              <div style={{ textAlign: 'right', marginTop: 24 }}>
                <Button type="primary" size="large" onClick={() => setCurrentStep(1)}>
                  Next: Download Template & Upload <ArrowRightOutlined />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 1: Download Template & Upload File */}
          {currentStep === 1 && (
            <Row gutter={[24, 24]}>
              <Col xs={24} md={10}>
                <Card title="Official Excel & CSV Template" bordered={false} style={{ borderRadius: 12, height: '100%' }}>
                  <Paragraph>
                    Download the pre-formatted template for <strong>{IMPORT_TYPES.find((t) => t.key === selectedType)?.title}</strong>. It includes sample valid data and detailed field definitions.
                  </Paragraph>
                  <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
                    <Button
                      block
                      icon={<FileExcelOutlined />}
                      onClick={() => handleDownloadTemplate('xlsx')}
                      style={{ borderColor: '#16a34a', color: '#16a34a' }}
                    >
                      Download Excel Template (.xlsx)
                    </Button>
                    <Button block icon={<FileTextOutlined />} onClick={() => handleDownloadTemplate('csv')}>
                      Download CSV Template (.csv)
                    </Button>
                  </Space>

                  <Divider />
                  <Alert
                    type="info"
                    showIcon
                    message="Safe Upload Guidelines"
                    description="Files are validated on the server. Limit per batch is 5,000 rows and 15MB. Formula injections are safely neutralized."
                  />
                </Card>
              </Col>

              <Col xs={24} md={14}>
                <Card title="Upload Spreadsheet (.xlsx, .xls, .csv)" bordered={false} style={{ borderRadius: 12, height: '100%' }}>
                  <Upload.Dragger
                    name="file"
                    multiple={false}
                    fileList={fileList}
                    beforeUpload={(file) => {
                      setFileList([file]);
                      return false; // Prevent automatic upload
                    }}
                    onRemove={() => setFileList([])}
                    accept=".xlsx,.xls,.csv"
                    style={{ padding: '24px 0' }}
                  >
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined style={{ fontSize: 48, color: '#2563eb' }} />
                    </p>
                    <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 500 }}>
                      Click or drag spreadsheet file to this area to upload
                    </p>
                    <p className="ant-upload-hint">
                      Supported formats: Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                    </p>
                  </Upload.Dragger>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(0)}>
                      Back
                    </Button>
                    <Button
                      type="primary"
                      icon={<ArrowRightOutlined />}
                      onClick={handleUploadFile}
                      loading={parsing}
                      disabled={fileList.length === 0}
                    >
                      Parse & Map Columns
                    </Button>
                  </div>
                </Card>
              </Col>
            </Row>
          )}

          {/* STEP 2: Column Mapping */}
          {currentStep === 2 && parsedData && (
            <Card bordered={false} style={{ borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    Map Spreadsheet Columns to Canonical Fields
                  </Title>
                  <Text type="secondary">
                    Review and confirm how your uploaded columns correspond to the school database schema.
                  </Text>
                </div>
                <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                  {parsedData.totalRows} Total Rows Detected
                </Tag>
              </div>

              <Table
                dataSource={parsedData.headers.map((h) => ({ header: h }))}
                rowKey="header"
                pagination={false}
                bordered
                size="middle"
                columns={[
                  {
                    title: 'Spreadsheet Header (From File)',
                    dataIndex: 'header',
                    key: 'header',
                    render: (text) => <Text strong>{text}</Text>,
                  },
                  {
                    title: 'Sample Value (Row 1)',
                    key: 'sample',
                    render: (_, record) => {
                      const val = parsedData.rows[0]?.[record.header];
                      return <Text type="secondary">{val !== undefined ? String(val) : '—'}</Text>;
                    },
                  },
                  {
                    title: 'System Canonical Target Field',
                    key: 'target',
                    render: (_, record) => {
                      const current = columnMapping[record.header] || '';
                      return (
                        <Select
                          style={{ width: '100%' }}
                          value={current}
                          placeholder="-- Do Not Import / Skip --"
                          onChange={(val) => {
                            setColumnMapping((prev) => ({
                              ...prev,
                              [record.header]: val,
                            }));
                          }}
                          allowClear
                        >
                          <Select.Option value="">-- Skip This Column --</Select.Option>
                          {parsedData.canonicalFields.map((f) => (
                            <Select.Option key={f.key} value={f.key}>
                              {f.label} {f.required ? '*(Required)' : ''}
                            </Select.Option>
                          ))}
                        </Select>
                      );
                    },
                  },
                ]}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button type="primary" icon={<ArrowRightOutlined />} onClick={handleRunValidation} loading={validating}>
                  Proceed to Validation & Preview
                </Button>
              </div>
            </Card>
          )}

          {/* STEP 3: Validation & Preview */}
          {currentStep === 3 && validationResult && (
            <div>
              {/* Summary Metrics */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6} md={3}>
                  <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center' }}>
                    <Statistic title="Total Rows" value={validationResult.summary.totalRows} />
                  </Card>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center' }}>
                    <Statistic
                      title="Valid Rows"
                      value={validationResult.summary.validRows}
                      valueStyle={{ color: '#16a34a' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center' }}>
                    <Statistic
                      title="Warnings"
                      value={validationResult.summary.warningRows}
                      valueStyle={{ color: '#d97706' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center' }}>
                    <Statistic
                      title="Invalid Rows"
                      value={validationResult.summary.invalidRows}
                      valueStyle={{ color: '#dc2626' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6} md={4}>
                  <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center' }}>
                    <Statistic
                      title="New Records"
                      value={validationResult.summary.newRecords}
                      valueStyle={{ color: '#2563eb' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6} md={4}>
                  <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center' }}>
                    <Statistic
                      title="Updates / Matches"
                      value={validationResult.summary.updateRecords}
                      valueStyle={{ color: '#0891b2' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center' }}>
                    <Statistic title="Issues Detected" value={validationResult.summary.issuesCount} />
                  </Card>
                </Col>
              </Row>

              {/* Actionable Issues Table */}
              {validationResult.issues.length > 0 && (
                <Card
                  title={`Validation Issues & Alerts (${validationResult.issues.length})`}
                  bordered={false}
                  style={{ borderRadius: 12, marginBottom: 24 }}
                >
                  <Table
                    dataSource={validationResult.issues}
                    rowKey={(r, idx) => `${r.row}-${r.field}-${idx}`}
                    size="small"
                    pagination={{ pageSize: 5 }}
                    columns={[
                      {
                        title: 'Row #',
                        dataIndex: 'row',
                        key: 'row',
                        width: 90,
                        render: (r) => <Tag>Row {r}</Tag>,
                      },
                      {
                        title: 'Type',
                        dataIndex: 'type',
                        key: 'type',
                        width: 110,
                        render: (t) =>
                          t === 'error' ? (
                            <Tag color="red" icon={<CloseCircleOutlined />}>
                              ERROR
                            </Tag>
                          ) : (
                            <Tag color="orange" icon={<WarningOutlined />}>
                              WARNING
                            </Tag>
                          ),
                      },
                      {
                        title: 'Field',
                        dataIndex: 'field',
                        key: 'field',
                        width: 160,
                        render: (f) => <Text code>{f}</Text>,
                      },
                      {
                        title: 'Supplied Value',
                        dataIndex: 'value',
                        key: 'value',
                        width: 180,
                        render: (v) => <Text type="secondary">{v !== undefined ? String(v) : '—'}</Text>,
                      },
                      {
                        title: 'Actionable Message',
                        dataIndex: 'message',
                        key: 'message',
                        render: (m) => <Text>{m}</Text>,
                      },
                    ]}
                  />
                </Card>
              )}

              {/* Data Preview Table */}
              <Card title="Parsed Data Preview (First 10 Rows)" bordered={false} style={{ borderRadius: 12 }}>
                <Table
                  dataSource={validationResult.rowSummaries.slice(0, 10)}
                  rowKey="rowNumber"
                  size="small"
                  pagination={false}
                  scroll={{ x: 800 }}
                  columns={[
                    {
                      title: 'Row',
                      dataIndex: 'rowNumber',
                      key: 'rowNumber',
                      width: 80,
                      render: (r) => <Tag>#{r}</Tag>,
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      width: 110,
                      render: (s) => (
                        <Tag color={s === 'valid' ? 'green' : s === 'warning' ? 'orange' : 'red'}>
                          {s.toUpperCase()}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Action',
                      dataIndex: 'isUpdate',
                      key: 'isUpdate',
                      width: 100,
                      render: (up) => <Tag color={up ? 'cyan' : 'blue'}>{up ? 'UPDATE' : 'CREATE'}</Tag>,
                    },
                    ...Object.values(columnMapping)
                      .filter(Boolean)
                      .map((canonKey) => ({
                        title: canonKey,
                        key: canonKey,
                        render: (_, record) => record.data[canonKey] || '—',
                      })),
                  ]}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(2)}>
                    Back to Column Mapping
                  </Button>
                  <Button
                    type="primary"
                    icon={<ArrowRightOutlined />}
                    onClick={handleRunReconciliation}
                    loading={reconciling}
                    disabled={validationResult.summary.invalidRows > 0}
                  >
                    Proceed to Relationship Reconciliation
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* STEP 4: Reconciliation */}
          {currentStep === 4 && reconciliationResult && (
            <Card bordered={false} style={{ borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    Class-Teacher-Subject Relationship Reconciliation
                  </Title>
                  <Text type="secondary">
                    Review how incoming spreadsheet rows resolve against existing school classes, teachers, and subjects.
                  </Text>
                </div>
                <Tag color="purple" style={{ fontSize: 14, padding: '4px 12px' }}>
                  {reconciliationResult.totalReconciled} Relationships Reconciled
                </Tag>
              </div>

              <Table
                dataSource={reconciliationResult.items}
                rowKey={(r, idx) => `${r.rowNumber}-${idx}`}
                bordered
                size="middle"
                columns={[
                  {
                    title: 'Row #',
                    dataIndex: 'rowNumber',
                    key: 'rowNumber',
                    width: 80,
                    render: (r) => <Tag>#{r}</Tag>,
                  },
                  {
                    title: 'Source Identifier',
                    dataIndex: 'identifier',
                    key: 'identifier',
                    render: (id) => <Text strong>{id}</Text>,
                  },
                  {
                    title: 'Relationship Type',
                    dataIndex: 'entity',
                    key: 'entity',
                  },
                  {
                    title: 'Proposed Target',
                    dataIndex: 'proposedRelationship',
                    key: 'proposedRelationship',
                    render: (p) => <Text code>{p}</Text>,
                  },
                  {
                    title: 'Reconciliation Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (st) => {
                      let color = 'green';
                      if (st === 'conflict') color = 'red';
                      else if (st === 'warning') color = 'orange';
                      else if (st === 'unresolved') color = 'volcano';
                      return <Tag color={color}>{st.toUpperCase()}</Tag>;
                    },
                  },
                  {
                    title: 'Reconciliation Notes & Actions',
                    key: 'action',
                    render: (_, record) => (
                      <div>
                        {record.note && (
                          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{record.note}</div>
                        )}
                        <Tag color="geekblue">{record.suggestedAction}</Tag>
                      </div>
                    ),
                  },
                ]}
              />

              {/* Account Provisioning Option */}
              <div
                style={{
                  marginTop: 24,
                  padding: 16,
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <Text strong style={{ fontSize: 15, display: 'block' }}>
                    <UsergroupAddOutlined /> Automatically Provision User Accounts?
                  </Text>
                  <Text type="secondary">
                    Create secure portal login accounts for new students, teachers, or parents with randomized temporary credentials. Existing accounts will be linked without resetting passwords.
                  </Text>
                </div>
                <Switch checked={provisionAccounts} onChange={setProvisionAccounts} checkedChildren="YES" unCheckedChildren="NO" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(3)}>
                  Back to Validation
                </Button>
                <Popconfirm
                  title="Confirm Bulk Database Commit"
                  description="Are you sure you want to commit these records into the school database? This will update profiles and allocations."
                  onConfirm={handleCommit}
                  okText="Yes, Commit Records"
                  cancelText="Review Again"
                >
                  <Button type="primary" size="large" icon={<CheckOutlined />} loading={committing} style={{ backgroundColor: '#16a34a' }}>
                    Confirm & Commit to Database
                  </Button>
                </Popconfirm>
              </div>
            </Card>
          )}

          {/* STEP 5: Execution Results */}
          {currentStep === 5 && commitResult && (
            <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center', padding: '32px 16px' }}>
              <CheckCircleOutlined style={{ fontSize: 64, color: '#16a34a', marginBottom: 16 }} />
              <Title level={3} style={{ margin: 0 }}>
                Bulk Import Execution Completed!
              </Title>
              <Paragraph type="secondary" style={{ fontSize: 15 }}>
                Job ID: <code>{commitResult.jobId}</code> • Status:{' '}
                <Tag color={commitResult.status === 'completed' ? 'green' : 'orange'}>
                  {commitResult.status.toUpperCase()}
                </Tag>
              </Paragraph>

              <Row gutter={[16, 16]} justify="center" style={{ margin: '32px 0' }}>
                <Col xs={12} sm={6} md={3}>
                  <Statistic title="Total Processed" value={commitResult.totalRows} />
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Statistic title="Created" value={commitResult.createdCount} valueStyle={{ color: '#16a34a' }} />
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Statistic title="Updated" value={commitResult.updatedCount} valueStyle={{ color: '#2563eb' }} />
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Statistic title="Skipped" value={commitResult.skippedCount} valueStyle={{ color: '#94a3b8' }} />
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Statistic title="Failed" value={commitResult.failedCount} valueStyle={{ color: '#dc2626' }} />
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Statistic
                    title="Accounts Provisioned"
                    value={commitResult.accountsProvisioned}
                    valueStyle={{ color: '#7c3aed' }}
                  />
                </Col>
              </Row>

              <Space size="middle">
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => handleExportReport(commitResult.jobId, 'xlsx')}
                >
                  Download Execution Audit Report (.xlsx)
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Start Another Import
                </Button>
                <Button onClick={() => setActiveTab('history')}>View Full Import History</Button>
              </Space>
            </Card>
          )}
        </div>
      ) : (
        /* HISTORY TAB */
        <Card bordered={false} style={{ borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>
              <HistoryOutlined /> Import History & Audit Log
            </Title>
            <Space>
              <Input
                placeholder="Search by Job ID or file..."
                prefix={<SearchOutlined />}
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                allowClear
              />
              <Button icon={<ReloadOutlined />} onClick={fetchHistory} loading={loadingHistory}>
                Refresh
              </Button>
            </Space>
          </div>

          <Table
            dataSource={historyJobs.filter(
              (j) =>
                !historySearch ||
                j.jobId?.toLowerCase().includes(historySearch.toLowerCase()) ||
                j.fileName?.toLowerCase().includes(historySearch.toLowerCase())
            )}
            rowKey="_id"
            loading={loadingHistory}
            columns={[
              {
                title: 'Job ID',
                dataIndex: 'jobId',
                key: 'jobId',
                render: (id) => <Text code>{id}</Text>,
              },
              {
                title: 'Dataset Type',
                dataIndex: 'importType',
                key: 'importType',
                render: (t) => <Tag color="blue">{t?.toUpperCase()}</Tag>,
              },
              {
                title: 'File Name',
                dataIndex: 'fileName',
                key: 'fileName',
              },
              {
                title: 'Rows',
                dataIndex: 'totalRows',
                key: 'totalRows',
                render: (r) => <Text>{r}</Text>,
              },
              {
                title: 'Created / Updated',
                key: 'counts',
                render: (_, r) => (
                  <Space>
                    <Tag color="green">+{r.createdCount || 0}</Tag>
                    <Tag color="blue">~{r.updatedCount || 0}</Tag>
                  </Space>
                ),
              },
              {
                title: 'Accounts',
                dataIndex: 'accountsProvisioned',
                key: 'accountsProvisioned',
                render: (a) => <Tag color="purple">{a || 0}</Tag>,
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (st) => (
                  <Tag color={st === 'completed' ? 'green' : st === 'partial' ? 'orange' : 'red'}>
                    {st?.toUpperCase()}
                  </Tag>
                ),
              },
              {
                title: 'Performed By',
                dataIndex: 'performedByName',
                key: 'performedByName',
                render: (p) => p || 'Admin',
              },
              {
                title: 'Timestamp',
                dataIndex: 'startedAt',
                key: 'startedAt',
                render: (d) => dayjs(d).format('MMM D, YYYY h:mm A'),
              },
              {
                title: 'Audit Report',
                key: 'action',
                render: (_, record) => (
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => handleExportReport(record.jobId, 'xlsx')}
                  >
                    Export
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
