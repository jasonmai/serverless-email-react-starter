resource "aws_s3_object" "static_website_contents" {
  for_each = fileset(var.web_dist_dir, "**")
  bucket   = var.s3_static_content_bucket_name
  key      = each.key
  source   = "${var.web_dist_dir}/${each.value}"
  content_type = lookup({
    ".html" : "text/html",
    ".css" : "text/css",
    ".js" : "application/javascript",
    ".json" : "application/json",
    ".xml" : "application/xml",
    ".jpg" : "image/jpeg",
    ".jpeg" : "image/jpeg",
    ".png" : "image/png",
    ".gif" : "image/gif",
    ".svg" : "image/svg+xml",
    ".webp" : "image/webp",
    ".mov" : "video/quicktime",
    ".mp4" : "video/mp4",
    ".ico" : "image/x-icon",
    ".woff" : "font/woff",
    ".woff2" : "font/woff2",
    ".ttf" : "font/ttf",
    ".eot" : "application/vnd.ms-fontobject",
    ".otf" : "font/otf"
  }, regex("\\.[^.]+$", each.value), null)
  source_hash = filebase64sha256("${var.web_dist_dir}/${each.value}")
}
