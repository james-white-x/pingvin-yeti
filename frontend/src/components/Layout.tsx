'use client';

import { AppShell } from '@mantine/core';
import { ReactNode } from 'react';
import Header from './header/Header'; 

const HEADER_HEIGHT = 60;

export function Layout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      header={{ height: HEADER_HEIGHT }}
      padding="md"
    >
      <AppShell.Header>
        <Header />
      </AppShell.Header>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}