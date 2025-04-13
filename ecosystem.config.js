module.exports={
  apps:[{
    name:"bot",
    script:"./index.js",
    watch:true,
    ignore_watch:["node_modules","logs"],
    log_date_format:"YYYY-MM-DD HH:mm:ss",
    out_file:"./logs/bot-combined.log",
    error_file:"./logs/bot-combined.log",
    merge_logs:true,
    time:true,
    autorestart:true
  }]
};
