import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface SlackNotificationPayload {
  alert_id?: string;
  incident_id?: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cluster_name: string;
  resource_name?: string;
  action?: 'create' | 'update' | 'resolve';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SlackNotificationPayload = await req.json();
    console.log('Slack notification payload:', payload);

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid authentication');
    }

    // Get user's Slack webhook configurations
    const { data: webhooks, error: webhookError } = await supabase
      .from('slack_webhooks')
      .select('*')
      .eq('user_id', user.id)
      .eq('enabled', true);

    if (webhookError) {
      console.error('Error fetching webhooks:', webhookError);
      throw new Error('Failed to fetch webhook configurations');
    }

    if (!webhooks || webhooks.length === 0) {
      console.log('No enabled webhooks found for user');
      return new Response(
        JSON.stringify({ success: true, message: 'No webhooks configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check notification preferences
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('notification_type', 'slack')
      .eq('enabled', true);

    if (prefError) {
      console.error('Error fetching preferences:', prefError);
    }

    // Filter webhooks based on severity threshold
    const enabledWebhooks = webhooks.filter(webhook => {
      const userPref = preferences?.find(p => 
        !p.cluster_id || p.cluster_id === webhook.cluster_id
      );
      
      if (!userPref) return true; // Send all if no preferences set
      
      const severityLevels = ['low', 'medium', 'high', 'critical'];
      const messageLevel = severityLevels.indexOf(payload.severity);
      const thresholdLevel = severityLevels.indexOf(userPref.severity_threshold);
      
      return messageLevel >= thresholdLevel;
    });

    // Format Slack message
    const severityEmoji = {
      low: '🟢',
      medium: '🟡', 
      high: '🟠',
      critical: '🔴'
    };

    const actionText = payload.action === 'resolve' ? 'RESOLVED' : 
                      payload.action === 'update' ? 'UPDATED' : 'ALERT';

    const slackMessage = {
      text: `${severityEmoji[payload.severity]} ${actionText}: ${payload.message}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${severityEmoji[payload.severity]} Kubernetes ${actionText}`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Severity:* ${payload.severity.toUpperCase()}`
            },
            {
              type: "mrkdwn",
              text: `*Cluster:* ${payload.cluster_name}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Message:* ${payload.message}`
          }
        }
      ]
    };

    if (payload.resource_name) {
      slackMessage.blocks[1].fields.push({
        type: "mrkdwn",
        text: `*Resource:* ${payload.resource_name}`
      });
    }

    if (payload.action !== 'resolve') {
      slackMessage.blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View in Dashboard"
            },
            url: `${Deno.env.get('SUPABASE_URL')?.replace('https://iejeszcdlpfgoufcjumj.supabase.co', 'https://iejeszcdlpfgoufcjumj.lovable.app') || 'https://iejeszcdlpfgoufcjumj.lovable.app'}/`,
            style: "primary"
          }
        ]
      });
    }

    // Send to all enabled webhooks
    const results = await Promise.allSettled(
      enabledWebhooks.map(async (webhook) => {
        const response = await fetch(webhook.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(slackMessage),
        });

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
        }

        return {
          webhook_id: webhook.id,
          channel: webhook.channel_name,
          success: true
        };
      })
    );

    // Log results
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    console.log(`Slack notifications sent: ${successful.length} successful, ${failed.length} failed`);

    if (failed.length > 0) {
      console.error('Failed notifications:', failed);
    }

    // Update incident timeline if incident_id provided
    if (payload.incident_id) {
      const timelineEvent = {
        timestamp: new Date().toISOString(),
        action: 'slack_notification',
        details: `Notification sent to ${successful.length} Slack channel(s)`,
        user_id: user.id
      };

      const { error: updateError } = await supabase
        .from('incident_timelines')
        .update({
          timeline_events: supabase.sql`timeline_events || ${JSON.stringify([timelineEvent])}`
        })
        .eq('id', payload.incident_id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating incident timeline:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: successful.length,
        failures: failed.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in slack-integration function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});