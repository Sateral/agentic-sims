import React, { Suspense } from 'react';
import Dashboard from '@/components/Dashboard/Dashboard';

const Page = async () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
};

export default Page;
