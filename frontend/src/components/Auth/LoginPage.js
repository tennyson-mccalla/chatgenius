import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f8f9fa;
`;

const LoginCard = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
`;

const Logo = styled.h1`
  color: #1264A3;
  margin-bottom: 2rem;
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  margin: 8px 0;
  border-radius: 4px;
  border: none;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;

  &.google {
    background-color: #4285f4;
    color: white;
    &:hover {
      background-color: #357abd;
    }
  }

  &.guest {
    background-color: #34a853;
    color: white;
    &:hover {
      background-color: #2d8644;
    }
  }
`;

const LoginPage = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/google`;
  };

  const handleGuestLogin = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/guest`, {
        method: 'POST',
      });
      const data = await response.json();
      localStorage.setItem('token', data.token);
      navigate('/chat');
    } catch (error) {
      console.error('Guest login failed:', error);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>ChatGenius</Logo>
        <Button className="google" onClick={handleGoogleLogin}>
          Sign in with Google
        </Button>
        <Button className="guest" onClick={handleGuestLogin}>
          Continue as Guest
        </Button>
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginPage;
