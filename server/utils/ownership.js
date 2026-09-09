const ensureOwnership = (resourceUserId, requesterUserId) => {
  if (!resourceUserId || !requesterUserId) {
    return false;
  }

  return String(resourceUserId) === String(requesterUserId);
};

module.exports = { ensureOwnership };
