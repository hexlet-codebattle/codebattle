import React, { type ReactNode } from 'react';

import { Container, Paper, Title } from '@mantine/core';

interface CardProps {
  children: ReactNode;
  title: ReactNode;
}

function Card({ title, children }: CardProps) {
  return (
    <Container size="xl" px={0} mb="md">
      <Paper bg="white" shadow="sm" radius="sm" py="lg">
        <Title order={3} ta="center" mb="lg">
          {title}
        </Title>
        {children}
      </Paper>
    </Container>
  );
}

export default Card;
