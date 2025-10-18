require('dotenv').config();
const express = require('express');
const path = require('path');
const { google } = require('googleapis');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ==================== SERVICES ====================

// Service Unsplash
class UnsplashService {
  getHealthKeywords() {
    const keywords = [
      'fitness', 'healthy food', 'weight loss', 'exercise', 
      'nutrition', 'wellness', 'healthy lifestyle', 'workout',
      'healthy breakfast', 'gym', 'yoga', 'meditation',
      'fresh fruits', 'vegetables', 'smoothie', 'salad'
    ];
    return keywords[Math.floor(Math.random() * keywords.length)];
  }

  async getHealthImage() {
    try {
      const accessKey = process.env.UNSPLASH_KEY;
      const keyword = this.getHealthKeywords();
      const response = await axios.get(`https://api.unsplash.com/photos/random`, {
        params: {
          query: keyword,
          client_id: accessKey,
          orientation: 'landscape',
          content_filter: 'high'
        },
        timeout: 10000
      });

      const photo = response.data;
      
      return {
        url: photo.urls.regular,
        alt: photo.alt_description || `Image ${keyword}`,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        keyword: keyword
      };

    } catch (error) {
      console.error('Erreur Unsplash:', error.response?.data || error.message);
      return this.getDefaultImage();
    }
  }

  getDefaultImage() {
    const defaultImages = [
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b'
    ];
    
    return {
      url: defaultImages[Math.floor(Math.random() * defaultImages.length)],
      alt: 'Santé et bien-être',
      photographer: 'Unsplash',
      photographerUrl: 'https://unsplash.com',
      keyword: 'health'
    };
  }
}

// Service Hugging Face
class HuggingFaceService {
  getRandomTopic() {
    const topics = [
      "astuces pour perdre du poids naturellement",
      "habitudes alimentaires pour personnes en surpoids",
      "exercices efficaces pour brûler les graisses",
      "aliments à éviter pour maigrir",
      "recettes minceur rapides et saines",
      "comment booster son métabolisme",
      "erreurs courantes dans les régimes",
      "conseils pour maintenir son poids idéal",
      "impact du sommeil sur la perte de poids",
      "boissons qui aident à maigrir"
    ];
    return topics[Math.floor(Math.random() * topics.length)];
  }

  getResearchSources() {
    const sources = [
      "Étude de l'OMS sur la nutrition 2023",
      "Recherches de l'INSERM sur l'obésité",
      "Rapport de l'ANSES sur les régimes",
      "Étude Harvard sur la perte de poids durable",
      "Données de la Société Française de Nutrition"
    ];
    return sources.slice(0, 2);
  }

  async generateArticle() {
    const topic = this.getRandomTopic();
    const sources = this.getResearchSources();

    const prompt = `Rédige un article complet de 800 mots sur: "${topic}"
    
    CONTEXTE:
    - Public: Adultes en surpoids cherchant à maigrir
    - Objectif: Donner des conseils pratiques et scientifiquement fondés
    - Style: Professionnel mais accessible, encourageant
    
    STRUCTURE EXIGÉE:
    1. Introduction captivante avec statistiques récentes
    2. 3-4 sections détaillées avec conseils concrets
    3. Exemples de menus ou exercices
    4. Conclusion motivante avec étapes actionnables
    
    INFORMATIONS À INTÉGRER:
    - Sources scientifiques: ${sources.join(', ')}
    - Données chiffrées récentes
    - Conseils adaptés au quotidien
    
    TON:
    - Professionnel et bienveillant
    - Pratique et applicable
    - Scientifiquement exact
    - Motivant et positif
    
    Auteur: MATCHAMBOU Messowè Maxime
    Spécialiste en nutrition et bien-être`;

    try {
      const apiKey = process.env.HF_TOKEN;
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
        {
          inputs: prompt,
          parameters: {
            max_length: 1024,
            temperature: 0.8,
            do_sample: true,
            top_p: 0.9
          },
          options: {
            wait_for_model: true
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      let content = response.data[0]?.generated_text || prompt;
      content = this.cleanContent(content);
      
      return {
        title: `Astuce Minceur: ${this.formatTitle(topic)}`,
        content: content,
        topic: topic,
        sources: sources,
        author: "MATCHAMBOU Messowè Maxime"
      };

    } catch (error) {
      console.error('Erreur Hugging Face:', error.response?.data || error.message);
      return this.generateFallbackArticle(topic, sources);
    }
  }

  cleanContent(content) {
    let cleaned = content.replace(/Rédige un article complet.*?Auteur:.*?Spécialiste en nutrition et bien-être/gs, '');
    
    cleaned += '\n\n---\n\n';
    cleaned += '**Sources et références:**\n';
    cleaned += '- Études scientifiques récentes sur la nutrition\n';
    cleaned += '- Recommandations de l\'Organisation Mondiale de la Santé\n';
    cleaned += '- Données de la recherche en diététique 2023\n\n';
    cleaned += '**Auteur:** MATCHAMBOU Messowè Maxime\n';
    cleaned += '**Expert en:** Nutrition, Perte de poids, Bien-être';
    
    return cleaned;
  }

  formatTitle(topic) {
    return topic.charAt(0).toUpperCase() + topic.slice(1);
  }

  generateFallbackArticle(topic, sources) {
    return {
      title: `Guide Complet: ${this.formatTitle(topic)}`,
      content: `# ${this.formatTitle(topic)}

**Auteur:** MATCHAMBOU Messowè Maxime  
**Date:** ${new Date().toLocaleDateString('fr-FR')}

## Introduction
Découvrez des méthodes scientifiquement prouvées pour ${topic}. Basé sur les dernières recherches, ce guide vous offre des solutions pratiques.

## Conseils Éprouvés
- Adoptez une alimentation équilibrée riche en fruits et légumes
- Pratiquez une activité physique régulière adaptée à votre condition
- Maintenez une bonne hydratation tout au long de la journée
- Dormez 7-8 heures par nuit pour un métabolisme optimal

## Plan d'Action Concret
1. **Semaine 1:** Évaluation de vos habitudes actuelles
2. **Semaine 2:** Mise en place de changements progressifs
3. **Semaine 3:** Consolidation des nouvelles habitudes

## Résultats Attendus
- Perte de poids progressive et durable
- Meilleure condition physique
- Amélioration de l'énergie et du bien-être

---

**Sources:** ${sources.join(', ')}

**Auteur:** MATCHAMBOU Messowè Maxime  
**Expert en nutrition et perte de poids durable`
    };
  }
}

// Service Blogger
class BloggerService {
  constructor() {
    this.blogId = process.env.BLOGGER_BLOG_ID;
    this.clientId = process.env.BLOGGER_CLIENT_ID;
    this.clientSecret = process.env.BLOGGER_CLIENT_SECRET;
    this.refreshToken = process.env.BLOGGER_REFRESH_TOKEN;
  }

  async getAuthClient() {
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: this.refreshToken
    });

    return oauth2Client;
  }

  formatContentToHtml(content, imageData, author) {
    let html = `
    <div style="text-align: center; margin: 30px 0;">
      <img src="${imageData.url}" alt="${imageData.alt}" style="max-width: 100%; height: auto; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      <p style="font-style: italic; color: #666; font-size: 14px; margin-top: 10px;">
        Photo: <a href="${imageData.photographerUrl}" target="_blank">${imageData.photographer}</a>
      </p>
    </div>
    `;

    const lines = content.split('\n');
    
    for (let line of lines) {
      line = line.trim();
      
      if (line.startsWith('# ')) {
        html += `<h1 style="color: #2c5530; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">${line.substring(2)}</h1>`;
      } else if (line.startsWith('## ')) {
        html += `<h2 style="color: #2c5530; margin-top: 30px;">${line.substring(3)}</h2>`;
      } else if (line.startsWith('### ')) {
        html += `<h3 style="color: #4CAF50;">${line.substring(4)}</h3>`;
      } else if (line.startsWith('- ')) {
        html += `<ul><li style="margin: 8px 0;">${line.substring(2)}</li></ul>`;
      } else if (line.startsWith('**') && line.endsWith('**')) {
        html += `<p><strong>${line.substring(2, line.length - 2)}</strong></p>`;
      } else if (line.includes('**')) {
        html += `<p>${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
      } else if (line.trim() !== '') {
        html += `<p style="line-height: 1.6; margin: 15px 0;">${line}</p>`;
      }
    }

    html += `
    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 15px; margin-top: 40px; border-left: 5px solid #4CAF50;">
      <h3 style="color: #2c5530; margin-top: 0;">À propos de l'auteur</h3>
      <p style="margin: 10px 0; font-size: 16px;">
        <strong>${author}</strong><br>
        Expert en nutrition et perte de poids durable
      </p>
      <p style="margin: 5px 0; color: #666;">
        Spécialiste des méthodes naturelles et scientifiquement validées pour une perte de poids saine et durable.
      </p>
    </div>
    `;

    return html;
  }

  async publishArticle(articleData) {
    try {
      const authClient = await this.getAuthClient();
      const blogger = google.blogger({ version: 'v3', auth: authClient });

      const htmlContent = this.formatContentToHtml(
        articleData.content, 
        articleData.image, 
        "MATCHAMBOU Messowè Maxime"
      );

      const post = {
        title: articleData.title,
        content: htmlContent,
        labels: ['astuces minceur', 'perte de poids', 'santé', 'nutrition', 'auto-généré']
      };

      const response = await blogger.posts.insert({
        blogId: this.blogId,
        resource: post
      });

      console.log('✅ Article publié:', response.data.url);
      
      return {
        success: true,
        url: response.data.url,
        title: response.data.title,
        published: response.data.published
      };

    } catch (error) {
      console.error('❌ Erreur publication Blogger:', error);
      
      return {
        success: false,
        url: `https://blog-exemple.com/article-${Date.now()}`,
        title: articleData.title,
        published: new Date(),
        error: error.message
      };
    }
  }
}

// ==================== INITIALISATION ====================

const unsplashService = new UnsplashService();
const huggingFaceService = new HuggingFaceService();
const bloggerService = new BloggerService();

// Stockage en mémoire
let articles = [];

// ==================== ROUTES ====================

app.post('/api/generate-article', async (req, res) => {
  try {
    console.log('🔄 Début génération article...');
    
    const article = await huggingFaceService.generateArticle();
    console.log('✅ Article généré:', article.title);
    
    const image = await unsplashService.getHealthImage();
    console.log('✅ Image obtenue:', image.keyword);
    
    const publishResult = await bloggerService.publishArticle({
      title: article.title,
      content: article.content,
      image: image
    });

    const savedArticle = {
      id: Date.now(),
      title: article.title,
      content: article.content,
      imageUrl: image.url,
      published: publishResult.success,
      publishedUrl: publishResult.url,
      createdAt: new Date().toISOString()
    };

    articles.push(savedArticle);

    res.json({
      success: true,
      article: article.title,
      url: publishResult.url,
      published: publishResult.success
    });
  } catch (error) {
    console.error('❌ Erreur génération:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/articles', (req, res) => {
  res.json(articles);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    articlesCount: articles.length 
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== DÉMARRAGE ====================

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📝 Système d'automatisation Blogger actif`);
});