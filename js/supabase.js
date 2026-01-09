// Supabase Configuration
const SUPABASE_URL = 'https://gzvyksvmivzzpjckfcfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dnlrc3ZtaXZ6enBqY2tmY2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MjMyODMsImV4cCI6MjA4MzQ5OTI4M30.T03-HcX2WQF0vZsDDTW0VwXpGyFyzExhEctoc3OS35k'; // Replace with your full publishable key

var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);