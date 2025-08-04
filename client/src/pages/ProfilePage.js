// client/src/pages/ProfilePage.js
import React from 'react';
import { Box, Typography } from '@mui/material';

const ProfilePage = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>
      <Typography>
        This page will soon display your stats, match history, and solved problems.
      </Typography>
    </Box>
  );
};

export default ProfilePage;