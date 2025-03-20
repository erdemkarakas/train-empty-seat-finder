import { NextRequest, NextResponse } from 'next/server';
import { startServerSearch } from '@/lib/server-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      searchFormData,
      telegramApiKey, 
      telegramChatId,
      userId,
      duration = 24 // Varsayılan 24 saat
    } = body;
    
    if (!searchFormData || !telegramApiKey || !telegramChatId || !userId) {
      return NextResponse.json({ 
        success: false, 
        message: "Eksik bilgi, gerekli alanlar: searchFormData, telegramApiKey, telegramChatId, userId" 
      }, { status: 400 });
    }
    
    const result = await startServerSearch(
      searchFormData,
      telegramApiKey,
      telegramChatId,
      userId,
      duration
    );
    
    return NextResponse.json({ 
      success: true, 
      message: "Arama başlatıldı",
      searchId: result.searchId,
      expiresAt: result.expiresAt
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu" 
    }, { status: 500 });
  }
} 