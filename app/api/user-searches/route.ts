import { NextRequest, NextResponse } from 'next/server';
import { getUserActiveSearches, cancelUserSearch } from '@/lib/server-service';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: "userId parametresi gerekli" 
      }, { status: 400 });
    }
    
    console.log(`[API] Getting active searches for userId: ${userId}`);
    const result = await getUserActiveSearches(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error in GET /api/user-searches:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu"
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, searchId } = await request.json();
    
    if (!userId || !searchId) {
      return NextResponse.json({ 
        success: false, 
        message: "userId ve searchId alanları gerekli" 
      }, { status: 400 });
    }
    
    console.log(`[API] Canceling search ${searchId} for userId: ${userId}`);
    const result = await cancelUserSearch(userId, searchId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error in DELETE /api/user-searches:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu"
    }, { status: 500 });
  }
} 