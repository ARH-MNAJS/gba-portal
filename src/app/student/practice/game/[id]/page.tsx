import React from 'react';
import { ClientGameComponent } from './ClientGameComponent';

// This is a server component (no "use client" directive)
export default function StudentGamePage({ params }: { params: { id: string } }) {
  // Properly unwrap params using React.use() in the server component
  const unwrappedParams = React.use(Promise.resolve(params));
  const gameId = unwrappedParams.id;
  
  // Server component returns the client component with the unwrapped gameId
  return <ClientGameComponent gameId={gameId} />;
} 