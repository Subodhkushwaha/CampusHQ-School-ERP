import { useEffect, useState } from 'react';

import { Tag, Row, Col } from 'antd';
import useLanguage from '@/locale/useLanguage';

import { useMoney } from '@/settings';

import { request } from '@/request';
import useFetch from '@/hooks/useFetch';
import useOnFetch from '@/hooks/useOnFetch';

import RecentTable from './components/RecentTable';

import SummaryCard from './components/SummaryCard';
import PreviewCard from './components/PreviewCard';
import CustomerPreviewCard from './components/CustomerPreviewCard';
import StudentWelcomeBanner from './components/StudentWelcomeBanner';
import StudentTasksCard from './components/StudentTasksCard';

import { selectMoneyFormat } from '@/redux/settings/selectors';
import { useSelector } from 'react-redux';

export default function DashboardModule() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const money_format_settings = useSelector(selectMoneyFormat);

  const getStatsData = async ({ entity, currency }) => {
    return await request.summary({
      entity,
      options: { currency },
    });
  };

  const {
    result: invoiceResult,
    isLoading: invoiceLoading,
    onFetch: fetchInvoicesStats,
  } = useOnFetch();

  const { result: quoteResult, isLoading: quoteLoading, onFetch: fetchQuotesStats } = useOnFetch();

  const {
    result: paymentResult,
    isLoading: paymentLoading,
    onFetch: fetchPayemntsStats,
  } = useOnFetch();

  const { result: clientResult, isLoading: clientLoading } = useFetch(() =>
    request.summary({ entity: 'client' })
  );

  useEffect(() => {
    const currency = money_format_settings.default_currency_code || null;

    if (currency) {
      fetchInvoicesStats(getStatsData({ entity: 'invoice', currency }));
      fetchQuotesStats(getStatsData({ entity: 'quote', currency }));
      fetchPayemntsStats(getStatsData({ entity: 'payment', currency }));
    }
  }, [money_format_settings.default_currency_code]);

  const dataTableColumns = [
    {
      title: 'Number',
      dataIndex: 'number',
    },
    {
      title: 'Faculty / Client',
      dataIndex: ['client', 'name'],
    },

    {
      title: 'Total',
      dataIndex: 'total',
      onCell: () => {
        return {
          style: {
            textAlign: 'right',
            whiteSpace: 'nowrap',
            direction: 'ltr',
          },
        };
      },
      render: (total, record) => moneyFormatter({ amount: total, currency_code: record.currency }),
    },
    {
      title: 'Status',
      dataIndex: 'status',
    },
  ];

  const entityData = [
    {
      result: invoiceResult,
      isLoading: invoiceLoading,
      entity: 'invoice',
      title: 'Tuition & Fees Breakdown',
    },
    {
      result: quoteResult,
      isLoading: quoteLoading,
      entity: 'quote',
      title: 'Proposals & Grants Breakdown',
    },
  ];

  const statisticCards = entityData.map((data, index) => {
    const { result, entity, isLoading, title } = data;

    return (
      <PreviewCard
        key={index}
        title={title}
        isLoading={isLoading}
        entity={entity}
        statistics={
          !isLoading &&
          result?.performance?.map((item) => ({
            tag: item?.status,
            color: 'blue',
            value: item?.percentage,
          }))
        }
      />
    );
  });

  if (money_format_settings) {
    return (
      <>
        <StudentWelcomeBanner />
        <Row gutter={[24, 24]}>
          <SummaryCard
            title={'Tuition & Fees'}
            prefix={'Semester Total'}
            isLoading={invoiceLoading}
            data={invoiceResult?.total}
          />
          <SummaryCard
            title={'Proposals & Grants'}
            prefix={'Active Budgets'}
            isLoading={quoteLoading}
            data={quoteResult?.total}
          />
          <SummaryCard
            title={'Paid Receipts'}
            prefix={'Disbursed'}
            isLoading={paymentLoading}
            data={paymentResult?.total}
          />
          <SummaryCard
            title={'Pending Dues'}
            prefix={'Outstanding'}
            isLoading={invoiceLoading}
            data={invoiceResult?.total_undue}
          />
        </Row>
        <div className="space30"></div>
        <Row gutter={[24, 24]}>
          <Col className="gutter-row w-full" xs={24} lg={15}>
            <div className="whiteBox shadow" style={{ height: '100%', minHeight: 440, borderRadius: 16 }}>
              <Row className="pad20" gutter={[0, 0]}>
                {statisticCards}
              </Row>
              <div style={{ padding: '0 20px 20px' }}>
                <CustomerPreviewCard
                  isLoading={clientLoading}
                  activeCustomer={clientResult?.active}
                  newCustomer={clientResult?.new}
                />
              </div>
            </div>
          </Col>
          <Col className="gutter-row w-full" xs={24} lg={9}>
            <StudentTasksCard />
          </Col>
        </Row>
        <div className="space30"></div>
        <Row gutter={[24, 24]}>
          <Col className="gutter-row w-full" sm={{ span: 24 }} lg={{ span: 12 }}>
            <div className="whiteBox shadow pad20" style={{ height: '100%', borderRadius: 16 }}>
              <h3 style={{ color: '#0f172a', marginBottom: 5, padding: '0 20px 20px', fontWeight: 600 }}>
                Recent Tuition & Fee Invoices
              </h3>

              <RecentTable entity={'invoice'} dataTableColumns={dataTableColumns} />
            </div>
          </Col>

          <Col className="gutter-row w-full" sm={{ span: 24 }} lg={{ span: 12 }}>
            <div className="whiteBox shadow pad20" style={{ height: '100%', borderRadius: 16 }}>
              <h3 style={{ color: '#0f172a', marginBottom: 5, padding: '0 20px 20px', fontWeight: 600 }}>
                Recent Project Proposals & Grants
              </h3>
              <RecentTable entity={'quote'} dataTableColumns={dataTableColumns} />
            </div>
          </Col>
        </Row>
      </>
    );
  } else {
    return <></>;
  }
}
