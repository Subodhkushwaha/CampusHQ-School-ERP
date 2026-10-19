import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import useLanguage from '@/locale/useLanguage';

import { Form, Button, Tag, Space } from 'antd';

import { login } from '@/redux/auth/actions';
import { selectAuth } from '@/redux/auth/selectors';
import LoginForm from '@/forms/LoginForm';
import Loading from '@/components/Loading';
import AuthModule from '@/modules/AuthModule';

const LoginPage = () => {
  const translate = useLanguage();
  const { isLoading, isSuccess } = useSelector(selectAuth);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const dispatch = useDispatch();
  const onFinish = (values) => {
    dispatch(login({ loginData: values }));
  };

  useEffect(() => {
    if (isSuccess) navigate('/');
  }, [isSuccess]);

  const setRoleCredentials = (email, password) => {
    // Security safeguard: Never programmatically insert admin credentials
    if (email?.toLowerCase().includes('admin')) {
      form.setFieldsValue({ email, password: '' });
      return;
    }
    form.setFieldsValue({ email, password });
  };

  useEffect(() => {
    // Security: Ensure password field is strictly empty when login opens or reloads
    form.setFieldsValue({ password: '' });
  }, [form]);

  useEffect(() => {
    // Safety cleanup: reset any stuck loading state from unhandled navigations
    return () => {
      if (isLoading && !isSuccess) {
        dispatch({ type: 'REQUEST_FAILED' });
      }
    };
  }, [isLoading, isSuccess, dispatch]);

  const FormContainer = () => {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 10px' }}>
            Select a demo role to pre-fill credentials or enter your school login:
          </p>

          <Space wrap size={[6, 8]} style={{ marginBottom: 14 }}>
            <Tag
              color="purple"
              style={{ cursor: 'pointer', padding: '4px 8px' }}
              onClick={() => setRoleCredentials('principal@school.edu', 'principal123')}
            >
              🏛️ Principal (principal@school.edu)
            </Tag>
            <Tag
              color="magenta"
              style={{ cursor: 'pointer', padding: '4px 8px' }}
              onClick={() => setRoleCredentials('teacher@school.edu', 'teacher123')}
            >
              👨‍🏫 Teacher (teacher@school.edu)
            </Tag>
            <Tag
              color="orange"
              style={{ cursor: 'pointer', padding: '4px 8px' }}
              onClick={() => setRoleCredentials('accountant@school.edu', 'accountant123')}
            >
              💰 Accountant (accountant@school.edu)
            </Tag>
            <Tag
              color="green"
              style={{ cursor: 'pointer', padding: '4px 8px' }}
              onClick={() => setRoleCredentials('student@school.edu', 'student123')}
            >
              🎓 Student (student@school.edu)
            </Tag>
            <Tag
              color="cyan"
              style={{ cursor: 'pointer', padding: '4px 8px' }}
              onClick={() => setRoleCredentials('parent@school.edu', 'parent123')}
            >
              👨‍👩‍👧 Parent (parent@school.edu)
            </Tag>
            <Tag
              color="geekblue"
              style={{ cursor: 'pointer', padding: '4px 8px' }}
              onClick={() => setRoleCredentials('receptionist@school.edu', 'receptionist123')}
            >
              📋 Receptionist (receptionist@school.edu)
            </Tag>
          </Space>
        </div>

        <Loading isLoading={isLoading}>
          <Form
            form={form}
            layout="vertical"
            name="normal_login"
            className="login-form"
            autoComplete="off"
            initialValues={{
              remember: true,
              email: '',
              password: '',
            }}
            onFinish={onFinish}
          >
            <LoginForm />
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="login-form-button"
                loading={isLoading}
                size="large"
                style={{ borderRadius: 8, fontWeight: 600, height: 44, width: '100%' }}
              >
                Sign In to School Portal
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button type="link" onClick={() => navigate('/landing')}>
              🏫 Campus Portal Tour & Overview
            </Button>
          </div>
        </Loading>
      </div>
    );
  };

  return <AuthModule authContent={<FormContainer />} AUTH_TITLE="CampusHQ School Portal Sign In" />;
};

export default LoginPage;
