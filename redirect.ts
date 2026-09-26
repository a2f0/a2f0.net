export default {
  fetch(request: Request): Response {
    const target = new URL(request.url);
    target.protocol = "https:";
    target.hostname = "resume.a2f0.net";
    target.port = "";
    return Response.redirect(target, 301);
  },
};
