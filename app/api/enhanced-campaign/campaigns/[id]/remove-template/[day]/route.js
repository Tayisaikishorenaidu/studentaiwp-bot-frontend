import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  try {
    const awaitedParams = await params;
    const { id, day } = awaitedParams;
    
    const token = request.headers.get('authorization')?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enhanced-campaign/campaigns/${id}/remove-template/${day}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to remove template' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Remove template error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 