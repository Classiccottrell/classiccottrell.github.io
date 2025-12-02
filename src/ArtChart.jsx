import React from 'react';
import { ScatterChart } from '@mui/x-charts/ScatterChart';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Tooltip, Typography, Box } from '@mui/material';

const theme = createTheme({
    typography: {
        fontFamily: '"Red Hat Display", sans-serif',
    },
    palette: {
        primary: {
            main: '#777C6D',
        },
    },
});

const data = [
    { id: 2, x: 1976, y: 1, title: 'Taxi Driver', director: 'Martin Scorsese' },
    { id: 3, x: 1979, y: 1, title: 'Apocalypse Now', director: 'Francis Ford Coppola' },
    { id: 1, x: 2019, y: 1, title: 'The Gentlemen', director: 'Guy Ritchie' },
];

export default function ArtChart() {
    return (
        <ThemeProvider theme={theme}>
            <Box sx={{ width: '100%', maxWidth: '1000px', margin: '0 auto', height: 300, bgcolor: '#F9F5F1', p: 2, borderRadius: 2 }}>
                <Typography variant="h5" align="center" gutterBottom sx={{ color: '#77736F' }}>
                    Film Timeline
                </Typography>
                <ScatterChart
                    series={[
                        {
                            label: 'Films',
                            data: data.map((item) => ({ x: item.x, y: item.y, id: item.id, title: item.title })),
                            color: '#437057',
                        },
                    ]}
                    xAxis={[{
                        label: 'Year',
                        min: 1970,
                        max: 2025,
                        tickInterval: [1970, 1980, 1990, 2000, 2010, 2020],
                        disableLine: false,
                        disableTicks: false,
                    }]}
                    yAxis={[{
                        min: 0,
                        max: 2,
                        disableLine: true,
                        disableTicks: true,
                        label: ''
                    }]}
                    tooltip={{
                        trigger: 'item',
                    }}
                    height={250}
                    margin={{ top: 10, bottom: 40, left: 40, right: 40 }}
                />
            </Box>
        </ThemeProvider>
    );
}
