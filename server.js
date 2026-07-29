require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Servir arquivos estáticos (HTML, CSS, JS) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// API Route: Retorna categorias de conteúdo da Netflix
app.get('/api/content', async (req, res) => {
    const tmdbKey = process.env.TMDB_API_KEY;
    const tmdbToken = process.env.TMDB_ACCESS_TOKEN;
    
    const hasKey = tmdbKey && tmdbKey !== 'SUA_CHAVE_AQUI';
    const hasToken = tmdbToken && tmdbToken !== 'SEU_TOKEN_AQUI';

    if (!hasKey && !hasToken) {
        return res.status(500).json({ error: 'Configure as chaves do TMDB para acessar as categorias da Netflix.' });
    }

    try {
        const config = {};
        const commonParams = {
            language: 'pt-BR',
            with_watch_providers: '8', // Netflix
            watch_region: 'BR',
            page: 1
        };

        if (hasToken) {
            config.headers = { Authorization: `Bearer ${tmdbToken}` };
            config.params = { ...commonParams };
        } else {
            config.params = { api_key: tmdbKey, ...commonParams };
        }

        const endpoints = [
            { title: "Lançamentos na Netflix", url: "https://api.themoviedb.org/3/discover/movie", params: { sort_by: 'primary_release_date.desc', 'primary_release_date.lte': new Date().toISOString().split('T')[0], 'vote_count.gte': 10 } },
            { title: "Séries em Alta", url: "https://api.themoviedb.org/3/discover/tv", params: { sort_by: 'popularity.desc' } },
            { title: "Filmes Populares", url: "https://api.themoviedb.org/3/discover/movie", params: { sort_by: 'popularity.desc' } },
            { title: "Ação e Aventura", url: "https://api.themoviedb.org/3/discover/movie", params: { sort_by: 'popularity.desc', with_genres: '28' } }
        ];

        const requests = endpoints.map(ep => 
            axios.get(ep.url, {
                headers: config.headers,
                params: { ...config.params, ...ep.params }
            })
        );

        const responses = await Promise.all(requests);

        const formatItem = (item, type) => ({
            id: item.id,
            type: type,
            title: item.title || item.name,
            overview: item.overview || 'Sinopse não disponível.',
            vote_average: item.vote_average || 0,
            backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
            image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null
        });

        const rows = responses.map((resData, index) => {
            const ep = endpoints[index];
            const type = ep.url.includes('/movie') ? 'movie' : 'tv';
            const items = (resData.data.results || [])
                .filter(m => m.poster_path && m.backdrop_path && (m.title || m.name))
                .map(m => formatItem(m, type));
            return { title: ep.title, items };
        });

        res.json({ rows });

    } catch (error) {
        console.error('Erro na API do TMDB:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Falha ao buscar dados do TMDB' });
    }
});

// API Route: Retorna o trailer de um filme ou série do TMDB
app.get('/api/trailer/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const tmdbKey = process.env.TMDB_API_KEY;
    const tmdbToken = process.env.TMDB_ACCESS_TOKEN;

    const hasKey = tmdbKey && tmdbKey !== 'SUA_CHAVE_AQUI';
    const hasToken = tmdbToken && tmdbToken !== 'SEU_TOKEN_AQUI';

    if (!hasKey && !hasToken) {
        return res.json({ key: null });
    }

    try {
        const config = { params: { language: 'pt-BR' } };
        if (hasToken) {
            config.headers = { Authorization: `Bearer ${tmdbToken}` };
        } else {
            config.params.api_key = tmdbKey;
        }

        const response = await axios.get(`https://api.themoviedb.org/3/${type}/${id}/videos`, config);
        const videos = response.data.results || [];
        
        // Procurar por um trailer oficial no YouTube
        let trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official);
        if (!trailer) {
            // Fallback para qualquer trailer do YouTube
            trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer');
        }
        if (!trailer) {
            // Fallback secundário para qualquer teaser ou clipe do YouTube
            trailer = videos.find(v => v.site === 'YouTube' && (v.type === 'Teaser' || v.type === 'Clip'));
        }
        if (!trailer && videos.length > 0) {
            // Fallback final para qualquer vídeo do YouTube disponível
            trailer = videos.find(v => v.site === 'YouTube');
        }

        res.json({ key: trailer ? trailer.key : null });

    } catch (error) {
        console.error(`Erro ao buscar trailer para ${type} ID ${id}:`, error.message);
        res.json({ key: null });
    }
});

// Iniciar servidor
const server = app.listen(PORT, () => {
    console.log(`\n=================================`);
    console.log(`🎬 Servidor Node.js Iniciado!`);
    console.log(`=================================`);
    console.log(`🌐 Acesso local: http://localhost:${PORT}`);
    console.log(`=================================\n`);
});

server.on('error', (e) => {
    console.error('Erro ao iniciar o servidor:', e);
});

// Exportar para Vercel
module.exports = app;
