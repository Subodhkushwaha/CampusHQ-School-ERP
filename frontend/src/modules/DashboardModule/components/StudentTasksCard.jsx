import React, { useState, useEffect } from 'react';
import { Card, List, Checkbox, Tag, Button, Input, Space, Typography, Progress, Empty } from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

const DEFAULT_TASKS = [
  {
    id: '1',
    title: 'Review Spring Semester Tuition & Lab Invoices',
    dueDate: 'In 3 days',
    category: 'Finance',
    color: 'blue',
    completed: false,
  },
  {
    id: '2',
    title: 'Submit Capstone Project Proposal (Quote) to Advisor',
    dueDate: 'In 5 days',
    category: 'Academic',
    color: 'purple',
    completed: true,
  },
  {
    id: '3',
    title: 'Apply for Departmental STEM Research Grant',
    dueDate: 'In 10 days',
    category: 'Grant',
    color: 'green',
    completed: false,
  },
  {
    id: '4',
    title: 'Clear Library & Equipment Dues',
    dueDate: 'In 14 days',
    category: 'Campus',
    color: 'orange',
    completed: false,
  },
];

export default function StudentTasksCard() {
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('student_academic_tasks');
      return saved ? JSON.parse(saved) : DEFAULT_TASKS;
    } catch {
      return DEFAULT_TASKS;
    }
  });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('student_academic_tasks', JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks', e);
    }
  }, [tasks]);

  const toggleTask = (id) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      dueDate: 'Upcoming',
      category: 'Coursework',
      color: 'cyan',
      completed: false,
    };
    setTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setIsAdding(false);
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const percent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div
      className="whiteBox shadow pad20"
      style={{
        borderRadius: 16,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
            <CalendarOutlined style={{ marginRight: 8, color: '#2563eb' }} />
            Academic Tasks & Deadlines
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Track semester milestones and fee deadlines
          </Text>
        </div>
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setIsAdding(!isAdding)}
          style={{ borderRadius: 6 }}
        >
          {isAdding ? 'Cancel' : 'Add Task'}
        </Button>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <Text type="secondary">Milestone Progress</Text>
          <Text strong style={{ color: percent === 100 ? '#16a34a' : '#2563eb' }}>
            {completedCount} of {tasks.length} Done ({percent}%)
          </Text>
        </div>
        <Progress percent={percent} status={percent === 100 ? 'success' : 'active'} strokeColor="#2563eb" size="small" />
      </div>

      {/* Inline Add Input */}
      {isAdding && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input
            placeholder="e.g. Submit CS401 assignment, pay hostel fee..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onPressEnter={addTask}
            autoFocus
          />
          <Button type="primary" onClick={addTask}>
            Save
          </Button>
        </div>
      )}

      {/* Task List */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 320 }}>
        {tasks.length === 0 ? (
          <Empty description="No deadlines active. You are all caught up!" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            dataSource={tasks}
            renderItem={(task) => (
              <List.Item
                style={{
                  padding: '10px 8px',
                  borderRadius: 8,
                  marginBottom: 6,
                  background: task.completed ? '#f8fafc' : '#ffffff',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <Checkbox checked={task.completed} onChange={() => toggleTask(task.id)} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text
                      delete={task.completed}
                      style={{
                        color: task.completed ? '#94a3b8' : '#1e293b',
                        fontWeight: task.completed ? 400 : 500,
                        fontSize: 13,
                        display: 'block',
                      }}
                      ellipsis
                    >
                      {task.title}
                    </Text>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
                      <Tag color={task.color} style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>
                        {task.category}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        <ClockCircleOutlined style={{ marginRight: 3 }} />
                        {task.dueDate}
                      </Text>
                    </div>
                  </div>
                </div>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => deleteTask(task.id)}
                  style={{ opacity: 0.6 }}
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
}
