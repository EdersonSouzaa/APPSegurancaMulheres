import React from 'react';
import { Redirect } from 'expo-router';

export default function RegisterRedirect() {
  return <Redirect href={{ pathname: '/login', params: { tab: 'cadastro' } }} />;
}
