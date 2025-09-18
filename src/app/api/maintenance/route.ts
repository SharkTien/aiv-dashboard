import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read current maintenance status from .env
    const envPath = path.join(process.cwd(), '.env');
    let maintenanceMode = false;
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      maintenanceMode = envContent.includes('MAINTENANCE_MODE=true');
    }

    return NextResponse.json({ 
      maintenanceMode,
      message: maintenanceMode ? 'Maintenance mode is ON' : 'Maintenance mode is OFF'
    });
  } catch (error) {
    console.error('Error checking maintenance status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { maintenanceMode } = await req.json();
    
    if (typeof maintenanceMode !== 'boolean') {
      return NextResponse.json({ error: 'Invalid maintenance mode value' }, { status: 400 });
    }

    // Update .env file
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Remove existing MAINTENANCE_MODE line
    envContent = envContent.replace(/^MAINTENANCE_MODE=.*$/m, '');
    
    // Add new MAINTENANCE_MODE
    if (maintenanceMode) {
      envContent += `\nMAINTENANCE_MODE=true\nMAINTENANCE_BYPASS=${Math.random().toString(36).substring(2, 15)}\n`;
    } else {
      envContent += `\nMAINTENANCE_MODE=false\n`;
    }

    // Write back to .env
    fs.writeFileSync(envPath, envContent);

    return NextResponse.json({ 
      success: true,
      maintenanceMode,
      message: maintenanceMode ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
      bypassUrl: maintenanceMode ? `?bypass=${envContent.match(/MAINTENANCE_BYPASS=(.+)/)?.[1]}` : null
    });
  } catch (error) {
    console.error('Error updating maintenance mode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
