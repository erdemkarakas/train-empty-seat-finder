import { NextResponse } from 'next/server';
import { fetchTrainAvailability } from '@/lib/tcdd-client';
import { hasAvailableSeats } from '@/lib/seat-availability';

// impit native binding kullanır: Node.js runtime gerekli.
export const runtime = 'nodejs';

/**
 * Bu API endpoint'i, Cloudflare Worker tarafından kullanılacak.
 * Belirli bir tren için müsaitlik kontrolü yapar ve sonucu döndürür.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { searchRequest, preferredClass, startTime, endTime } = body;
    
    if (!searchRequest) {
      return NextResponse.json({ 
        success: false, 
        message: "Arama parametreleri eksik" 
      }, { status: 400 });
    }
    
    // TCDD API sorgusu (sunucu: impit)
    const data = await fetchTrainAvailability(searchRequest);
    
    // Boş koltuk kontrolü
    const result = hasAvailableSeats(
      data,
      preferredClass || "ANY",
      startTime,
      endTime
    );
    
    return NextResponse.json({
      success: true,
      found: result.found,
      message: result.message,
      details: result.details
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu",
      found: false
    }, { status: 500 });
  }
} 