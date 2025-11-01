"use client";
import React from 'react';
import { Box, Button, Typography, Chip, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useSelector } from 'react-redux';

const TokenSelectorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: theme.spacing(1),
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
}));

const TokenButton = styled(Button)(({ theme, selected }) => ({
  minWidth: '80px',
  height: '36px',
  borderRadius: theme.spacing(0.5),
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  border: '1px solid',
  borderColor: selected ? theme.palette.primary.main : 'rgba(255, 255, 255, 0.2)',
  backgroundColor: selected ? theme.palette.primary.main : 'transparent',
  color: selected ? '#000000' : 'rgba(255, 255, 255, 0.9)', // Seçili iken siyah, değilse beyaz
  '&:hover': {
    backgroundColor: selected ? theme.palette.primary.dark : 'rgba(255, 255, 255, 0.1)',
    borderColor: selected ? theme.palette.primary.dark : theme.palette.primary.main,
    color: selected ? '#000000' : 'rgba(255, 255, 255, 1)', // Hover'da da aynı renk mantığı
  },
  transition: 'all 0.2s ease-in-out',
}));

const BalanceChip = styled(Chip)(({ theme }) => ({
  height: '24px',
  fontSize: '0.75rem',
  fontWeight: 500,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: theme.palette.text.secondary,
  '& .MuiChip-label': {
    padding: '0 8px',
  },
}));

const TokenSelector = ({ 
  selectedToken = 'FLOW', 
  onTokenChange, 
  showBalances = true,
  size = 'medium',
  disabled = false 
}) => {
  const { userFlowBalance, userFrothBalance } = useSelector((state) => state.balance);

  const handleTokenSelect = (token) => {
    if (!disabled && onTokenChange) {
      onTokenChange(token);
    }
  };

  const formatBalance = (balance, token) => {
    const num = parseFloat(balance || '0');
    if (token === 'FROTH') {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
      }
      return num.toFixed(2);
    } else {
      return num.toFixed(4);
    }
  };

  const getTokenInfo = (token) => {
    if (token === 'FLOW') {
      return {
        symbol: 'FLOW',
        name: 'Flow Token',
        balance: userFlowBalance,
        color: '#00EF8B',
        description: 'Native Flow blockchain token'
      };
    } else {
      return {
        symbol: 'FROTH',
        name: 'FROTH Token',
        balance: userFrothBalance,
        color: '#FF6B35',
        description: 'KittyPunch memecoin on Flow EVM'
      };
    }
  };

  return (
    <TokenSelectorContainer>
      <Typography variant="body2" sx={{ color: 'text.secondary', mr: 1 }}>
        Token:
      </Typography>
      
      {['FLOW', 'FROTH'].map((token) => {
        const tokenInfo = getTokenInfo(token);
        const isSelected = selectedToken === token;
        
        return (
          <Tooltip 
            key={token}
            title={`${tokenInfo.name} - ${tokenInfo.description}`}
            arrow
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <TokenButton
                selected={isSelected}
                onClick={() => handleTokenSelect(token)}
                disabled={disabled}
                size={size}
              >
                {tokenInfo.symbol}
              </TokenButton>
              
              {showBalances && (
                <BalanceChip
                  label={formatBalance(tokenInfo.balance, token)}
                  size="small"
                  sx={{
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: isSelected ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.7)', // Seçili iken koyu, değilse açık
                  }}
                />
              )}
            </Box>
          </Tooltip>
        );
      })}
      

    </TokenSelectorContainer>
  );
};

export default TokenSelector;