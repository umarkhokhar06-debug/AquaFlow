const installationService = require('../services/installationService');

class InstallationController {
  async requestInstallation(req, res) {
    try {
      const installation = await installationService.requestInstallation(req.body, req.user);
      res.status(201).json({ success: true, installation });
    } catch (error) {
      console.error('Request installation error:', error);
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to submit installation request' });
    }
  }

  async getAll(req, res) {
    try {
      const installations = await installationService.getAll({ status: req.query.status });
      res.status(200).json({ success: true, installations });
    } catch (error) {
      console.error('Get installations error:', error);
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch installation requests' });
    }
  }

  async getMine(req, res) {
    try {
      const installations = await installationService.getMine(req.user.id);
      res.status(200).json({ success: true, installations });
    } catch (error) {
      console.error('Get my installation jobs error:', error);
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch your installation jobs' });
    }
  }

  async getById(req, res) {
    try {
      const installation = await installationService.getById(req.params.id, req.user);
      res.status(200).json({ success: true, installation });
    } catch (error) {
      console.error('Get installation by id error:', error);
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch installation request' });
    }
  }

  async assignInstaller(req, res) {
    try {
      const installation = await installationService.assignInstaller(req.params.id, req.body.installerId, req.user);
      res.status(200).json({ success: true, installation });
    } catch (error) {
      console.error('Assign installer error:', error);
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to assign installer' });
    }
  }

  async completeInstallation(req, res) {
    try {
      const installation = await installationService.completeInstallation(req.params.id, req.body, req.user);
      res.status(200).json({ success: true, installation });
    } catch (error) {
      console.error('Complete installation error:', error);
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to complete installation' });
    }
  }
}

module.exports = new InstallationController();
